-- ═══════════════════════════════════════════════════════════════════════════════
-- CONFIDENCE COLLAPSE CONTROL LAYER
-- Converts system from "reactive scoring engine" to "evidence-weighted decision authority"
--
-- Rules:
--   R1 — Hard Collapse (allow 0): ≥3 CLOSED_DETECTED, ≥2 distinct API keys, 24h, avg trust ≥ 0.6
--   R2 — Soft Protection (block collapse): enforce floor = 20 when R1 not met
--   R3 — Time Decay Escape: no signals in 48h → allow full decay past floor
--   R4 — Partial Collapse: 1–2 closure signals OR mixed → clamp 20–40
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. RPC: Evaluate collapse eligibility for a place
--    Returns a JSONB verdict used by ingest_signal and the API layer

CREATE OR REPLACE FUNCTION public.evaluate_collapse_eligibility(
    p_place_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_closed_signal_count    INT;
    v_distinct_api_keys      INT;
    v_avg_trust              FLOAT;
    v_last_signal_age_hours  FLOAT;
    v_positive_signal_count  INT;
    v_total_24h_signals      INT;
    v_consensus_score        FLOAT;
    v_collapse_allowed       BOOLEAN := FALSE;
    v_collapse_reason        TEXT    := 'collapse_blocked_low_consensus';
BEGIN
    -- Count CLOSED_DETECTED signals in last 24h
    SELECT COUNT(*)
    INTO v_closed_signal_count
    FROM public.validation_signals
    WHERE place_id = p_place_id
      AND signal_type = 'CLOSED_DETECTED'::public.signal_type
      AND created_at > (NOW() - INTERVAL '24 hours');

    -- Count distinct API keys that sent CLOSED_DETECTED in last 24h
    SELECT COUNT(DISTINCT api_key_id)
    INTO v_distinct_api_keys
    FROM public.validation_signals
    WHERE place_id = p_place_id
      AND signal_type = 'CLOSED_DETECTED'::public.signal_type
      AND api_key_id IS NOT NULL
      AND created_at > (NOW() - INTERVAL '24 hours');

    -- Average trust score of those API keys
    SELECT COALESCE(AVG(t.trust_score), 0)
    INTO v_avg_trust
    FROM public.api_key_trust t
    WHERE t.api_key_id IN (
        SELECT DISTINCT vs.api_key_id
        FROM public.validation_signals vs
        WHERE vs.place_id = p_place_id
          AND vs.signal_type = 'CLOSED_DETECTED'::public.signal_type
          AND vs.api_key_id IS NOT NULL
          AND vs.created_at > (NOW() - INTERVAL '24 hours')
    );

    -- Hours since last signal of any type
    SELECT EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600.0
    INTO v_last_signal_age_hours
    FROM public.validation_signals
    WHERE place_id = p_place_id;

    -- If no signals at all, treat as very old
    IF v_last_signal_age_hours IS NULL THEN
        v_last_signal_age_hours := 999;
    END IF;

    -- Count positive signals in 24h (for mixed signal detection)
    SELECT COUNT(*)
    INTO v_positive_signal_count
    FROM public.validation_signals
    WHERE place_id = p_place_id
      AND confidence_impact > 0
      AND created_at > (NOW() - INTERVAL '24 hours');

    -- Total signals in 24h
    SELECT COUNT(*)
    INTO v_total_24h_signals
    FROM public.validation_signals
    WHERE place_id = p_place_id
      AND created_at > (NOW() - INTERVAL '24 hours');

    -- ═══ Compute Signal Consensus Score (0–1) ═══
    -- 1.0 = unanimous strong negative consensus
    -- 0.0 = no closure evidence or pure conflict
    IF v_total_24h_signals = 0 THEN
        v_consensus_score := 0;
    ELSE
        v_consensus_score := LEAST(1.0,
            (v_closed_signal_count::FLOAT / GREATEST(v_total_24h_signals, 1))
            * (v_distinct_api_keys::FLOAT / GREATEST(v_distinct_api_keys, 1))
            * LEAST(v_avg_trust / 0.6, 1.0)
        );
    END IF;

    -- ═══ RULE 3 — Time Decay Escape ═══
    IF v_last_signal_age_hours >= 48 THEN
        v_collapse_allowed := TRUE;
        v_collapse_reason  := 'decay_override_no_activity';

    -- ═══ RULE 1 — Hard Collapse Conditions ═══
    ELSIF v_closed_signal_count >= 3
      AND v_distinct_api_keys >= 2
      AND v_avg_trust >= 0.6
    THEN
        v_collapse_allowed := TRUE;
        v_collapse_reason  := 'validated_closure_detected';

    -- ═══ RULE 4 — Partial Collapse (Uncertain) ═══
    ELSIF (v_closed_signal_count BETWEEN 1 AND 2)
       OR (v_closed_signal_count >= 1 AND v_positive_signal_count >= 1)
    THEN
        v_collapse_allowed := FALSE;
        v_collapse_reason  := 'partial_evidence_uncertain';

    -- ═══ RULE 2 — Soft Protection ═══
    ELSE
        v_collapse_allowed := FALSE;
        v_collapse_reason  := 'collapse_blocked_low_consensus';
    END IF;

    RETURN jsonb_build_object(
        'collapse_allowed',      v_collapse_allowed,
        'collapse_reason',       v_collapse_reason,
        'signal_consensus_score', ROUND(v_consensus_score::NUMERIC, 3),
        'closed_signals_24h',    v_closed_signal_count,
        'distinct_api_keys',     v_distinct_api_keys,
        'avg_trust',             ROUND(v_avg_trust::NUMERIC, 3),
        'positive_signals_24h',  v_positive_signal_count,
        'hours_since_last_signal', ROUND(v_last_signal_age_hours::NUMERIC, 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Replace ingest_signal with Collapse Control integration
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.ingest_signal(
    p_place_id UUID,
    p_signal_type TEXT,
    p_signal_value JSONB,
    p_confidence_impact INT,
    p_user_id UUID,
    p_source_type TEXT DEFAULT 'INTERNAL',
    p_api_key_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_current_score      FLOAT;
    v_raw_new_score      FLOAT;
    v_smoothed_score     FLOAT;
    v_clamped_score      INT;
    v_adjusted_impact    FLOAT;
    v_is_duplicate       BOOLEAN;
    v_updated_place      JSONB;
    v_unique_users       INT;
    v_unique_types       INT;
    v_burst_count        INT;
    v_hourly_key_count   INT;
    v_collapse_verdict   JSONB;
    v_collapse_allowed   BOOLEAN;
    v_collapse_reason    TEXT;
    v_consensus_score    FLOAT;
    v_closed_count_24h   INT;
    v_positive_count_24h INT;
BEGIN
    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 1: SECURITY & LOCKING
    -- ══════════════════════════════════════════════════════════════════════════

    SELECT confidence_score INTO v_current_score
    FROM public.places
    WHERE id = p_place_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Place not found or unauthorized';
    END IF;

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 2: PRE-INGESTION GUARDS
    -- ══════════════════════════════════════════════════════════════════════════

    -- Trust Rate Limiting: Max 3 signals per API key per place per hour
    IF p_api_key_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_hourly_key_count
        FROM public.validation_signals
        WHERE place_id = p_place_id
          AND api_key_id = p_api_key_id
          AND created_at > (NOW() - INTERVAL '1 hour');

        IF v_hourly_key_count >= 3 THEN
            INSERT INTO public.activity_logs (place_id, event_type, event_meta)
            VALUES (p_place_id, 'LOW_TRUST_IGNORED', jsonb_build_object(
                'api_key_id', p_api_key_id,
                'reason', 'Hourly rate limit exceeded (3 per hour)',
                'signal_type', p_signal_type
            ));
            RETURN (SELECT row_to_json(places.*) FROM public.places WHERE id = p_place_id);
        END IF;
    END IF;

    v_adjusted_impact := p_confidence_impact::FLOAT;

    -- Burst Protection: >5 negative signals in 5 min → 50% weight reduction
    SELECT COUNT(*) INTO v_burst_count
    FROM public.validation_signals
    WHERE place_id = p_place_id
      AND confidence_impact < 0
      AND created_at > (NOW() - INTERVAL '5 minutes');

    IF v_burst_count >= 5 AND v_adjusted_impact < 0 THEN
        v_adjusted_impact := v_adjusted_impact * 0.5;
        INSERT INTO public.activity_logs (place_id, event_type, event_meta)
        VALUES (p_place_id, 'BURST_PROTECTION_TRIGGERED', jsonb_build_object(
            'burst_count', v_burst_count,
            'reduction', '50%',
            'signal_type', p_signal_type
        ));
    END IF;

    -- Anti-Spam: same signal_type within 2 min → reduce impact
    SELECT EXISTS (
        SELECT 1 FROM public.validation_signals
        WHERE place_id = p_place_id
          AND signal_type = p_signal_type::public.signal_type
          AND created_at > (NOW() - INTERVAL '2 minutes')
    ) INTO v_is_duplicate;

    IF v_is_duplicate THEN
        v_adjusted_impact := v_adjusted_impact * 0.7;
    END IF;

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 3: PERSIST THE SIGNAL (before collapse evaluation so it's counted)
    -- ══════════════════════════════════════════════════════════════════════════

    INSERT INTO public.validation_signals (
        place_id, signal_type, signal_value, confidence_impact, user_id, source_type, api_key_id
    )
    VALUES (
        p_place_id, p_signal_type::public.signal_type, p_signal_value,
        v_adjusted_impact::INT, p_user_id, p_source_type, p_api_key_id
    );

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 4: SCORE COMPUTATION (Smoothing + Clamping)
    -- ══════════════════════════════════════════════════════════════════════════

    -- A. Raw predicted score
    v_raw_new_score := GREATEST(0, LEAST(100,
        v_current_score + (v_adjusted_impact * (1.0 - v_current_score / 100.0))
    ));

    -- B. EMA Smoothing: (0.7 × previous) + (0.3 × computed)
    v_smoothed_score := (0.7 * v_current_score) + (0.3 * v_raw_new_score);

    -- C. Rate Clamping: max drop −25, max rise +20 per signal
    IF (v_smoothed_score - v_current_score) < -25 THEN
        v_clamped_score := ROUND(v_current_score - 25);
        INSERT INTO public.activity_logs (place_id, event_type, event_meta)
        VALUES (p_place_id, 'SCORE_STABILIZED', jsonb_build_object(
            'clamped_from', v_smoothed_score,
            'clamped_to', v_clamped_score,
            'type', 'DROP_CLAMP'
        ));
    ELSIF (v_smoothed_score - v_current_score) > 20 THEN
        v_clamped_score := ROUND(v_current_score + 20);
        INSERT INTO public.activity_logs (place_id, event_type, event_meta)
        VALUES (p_place_id, 'SCORE_STABILIZED', jsonb_build_object(
            'clamped_from', v_smoothed_score,
            'clamped_to', v_clamped_score,
            'type', 'RISE_CLAMP'
        ));
    ELSE
        v_clamped_score := ROUND(v_smoothed_score);
    END IF;

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 5: COLLAPSE CONTROL LAYER (THE CORE OF THIS MIGRATION)
    -- ══════════════════════════════════════════════════════════════════════════

    v_collapse_verdict := public.evaluate_collapse_eligibility(p_place_id);
    v_collapse_allowed := (v_collapse_verdict->>'collapse_allowed')::BOOLEAN;
    v_collapse_reason  := v_collapse_verdict->>'collapse_reason';
    v_consensus_score  := (v_collapse_verdict->>'signal_consensus_score')::FLOAT;

    IF v_clamped_score < 20 THEN
        IF v_collapse_allowed THEN
            -- ═══ RULE 1 or RULE 3: Allow full collapse ═══
            -- Score stays as-is (can go to 0)
            INSERT INTO public.activity_logs (place_id, event_type, event_meta)
            VALUES (p_place_id, 'COLLAPSE_PERMITTED', jsonb_build_object(
                'reason', v_collapse_reason,
                'consensus_score', v_consensus_score,
                'final_score', v_clamped_score,
                'verdict', v_collapse_verdict
            ));
        ELSE
            -- ═══ RULE 2: Block collapse, enforce floor ═══
            INSERT INTO public.activity_logs (place_id, event_type, event_meta)
            VALUES (p_place_id, 'COLLAPSE_BLOCKED', jsonb_build_object(
                'reason', v_collapse_reason,
                'attempted_score', v_clamped_score,
                'enforced_floor', 20,
                'consensus_score', v_consensus_score,
                'verdict', v_collapse_verdict
            ));
            v_clamped_score := 20;
        END IF;
    END IF;

    -- ═══ RULE 4: Partial Collapse — clamp 20–40 if uncertain ═══
    IF v_collapse_reason = 'partial_evidence_uncertain' THEN
        v_clamped_score := GREATEST(20, LEAST(40, v_clamped_score));
    END IF;

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 6: FINALIZE & PERSIST
    -- ══════════════════════════════════════════════════════════════════════════

    SELECT COUNT(DISTINCT user_id), COUNT(DISTINCT signal_type)
    INTO v_unique_users, v_unique_types
    FROM public.validation_signals
    WHERE place_id = p_place_id;

    -- Legacy single-source cap
    IF v_unique_users < 2 AND v_unique_types < 2 THEN
        v_clamped_score := LEAST(v_clamped_score, 75);
    END IF;

    -- History tracking
    INSERT INTO public.signal_events (
        place_id, signal_type, confidence_delta, score_before, score_after, metadata
    ) VALUES (
        p_place_id, p_signal_type,
        v_clamped_score - v_current_score::INT,
        v_current_score::INT,
        v_clamped_score,
        jsonb_build_object(
            'signal_value', p_signal_value,
            'collapse_verdict', v_collapse_verdict
        )
    );

    UPDATE public.places
    SET
        confidence_score   = v_clamped_score,
        unique_sources_count = v_unique_users,
        last_validated_at  = NOW()
    WHERE id = p_place_id
    RETURNING row_to_json(places.*) INTO v_updated_place;

    RETURN v_updated_place;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
