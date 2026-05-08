-- ═══════════════════════════════════════════════════════════════════════════════
-- DECISION INTELLIGENCE SYSTEM UPGRADE
-- Layer 1: Time-Weighted Consensus
-- Layer 2: Adaptive Intelligence (Per-Place Behavior)
-- Layer 3: Recovery Engine
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. ADAPTIVE INTELLIGENCE SCHEMA
DO $$ BEGIN
    CREATE TYPE public.environment_type AS ENUM ('HIGH_ACTIVITY', 'MEDIUM_ACTIVITY', 'LOW_ACTIVITY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.place_behavior_profile (
    place_id UUID PRIMARY KEY REFERENCES public.places(id) ON DELETE CASCADE,
    avg_daily_signals FLOAT DEFAULT 0,
    avg_traffic_variance FLOAT DEFAULT 0,
    signal_frequency_score FLOAT DEFAULT 0,
    environment_type public.environment_type DEFAULT 'MEDIUM_ACTIVITY',
    last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper to update the behavior profile for a place
CREATE OR REPLACE FUNCTION public.update_place_behavior_profile(p_place_id UUID)
RETURNS public.environment_type AS $$
DECLARE
    v_total_signals INT;
    v_days FLOAT;
    v_avg_daily FLOAT;
    v_env_type public.environment_type;
BEGIN
    -- Calculate signals in the last 14 days
    SELECT COUNT(*) INTO v_total_signals
    FROM public.validation_signals
    WHERE place_id = p_place_id
      AND created_at > (NOW() - INTERVAL '14 days');

    -- Assume a minimum of 1 day to prevent div by zero
    v_days := 14.0;
    v_avg_daily := v_total_signals / v_days;

    IF v_avg_daily > 20 THEN
        v_env_type := 'HIGH_ACTIVITY';
    ELSIF v_avg_daily >= 5 THEN
        v_env_type := 'MEDIUM_ACTIVITY';
    ELSE
        v_env_type := 'LOW_ACTIVITY';
    END IF;

    INSERT INTO public.place_behavior_profile (
        place_id, avg_daily_signals, environment_type, last_updated_at
    ) VALUES (
        p_place_id, v_avg_daily, v_env_type, NOW()
    )
    ON CONFLICT (place_id) DO UPDATE
    SET avg_daily_signals = EXCLUDED.avg_daily_signals,
        environment_type = EXCLUDED.environment_type,
        last_updated_at = NOW();

    RETURN v_env_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. UPDATE EVALUATE_COLLAPSE_ELIGIBILITY (Layer 1 & Layer 2)
CREATE OR REPLACE FUNCTION public.evaluate_collapse_eligibility(
    p_place_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_closed_signal_count    INT;
    v_weighted_closed        FLOAT := 0;
    v_weighted_positive      FLOAT := 0;
    v_distinct_api_keys      INT;
    v_avg_trust              FLOAT;
    v_last_signal_age_hours  FLOAT;
    v_positive_signal_count  INT;
    v_total_24h_signals      INT;
    v_consensus_score        FLOAT;
    v_collapse_allowed       BOOLEAN := FALSE;
    v_collapse_reason        TEXT    := 'collapse_blocked_low_consensus';
    v_env_type               public.environment_type;
    v_collapse_threshold     INT;
    v_trust_target           FLOAT;
BEGIN
    -- Ensure behavior profile is up-to-date and fetch env type
    v_env_type := public.update_place_behavior_profile(p_place_id);

    -- Adaptive Rules: Collapse Thresholds and Trust Sensitivity
    IF v_env_type = 'HIGH_ACTIVITY' THEN
        v_collapse_threshold := 4;
        v_trust_target := 0.7; -- Higher trust needed
    ELSIF v_env_type = 'LOW_ACTIVITY' THEN
        v_collapse_threshold := 2;
        v_trust_target := 0.5; -- Relaxed trust
    ELSE
        v_collapse_threshold := 3;
        v_trust_target := 0.6;
    END IF;

    -- Time-Weighted Signals: Count CLOSED_DETECTED signals in last 24h
    SELECT 
        COUNT(*),
        COALESCE(SUM(EXP(-0.08 * (EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0))), 0)
    INTO v_closed_signal_count, v_weighted_closed
    FROM public.validation_signals
    WHERE place_id = p_place_id
      AND signal_type = 'CLOSED_DETECTED'::public.signal_type
      AND created_at > (NOW() - INTERVAL '24 hours')
      AND (signal_value->>'is_simulated') IS DISTINCT FROM 'true'; -- Constraint: NOT use simulated data

    -- Distinct API keys for CLOSED_DETECTED
    SELECT COUNT(DISTINCT api_key_id)
    INTO v_distinct_api_keys
    FROM public.validation_signals
    WHERE place_id = p_place_id
      AND signal_type = 'CLOSED_DETECTED'::public.signal_type
      AND api_key_id IS NOT NULL
      AND created_at > (NOW() - INTERVAL '24 hours')
      AND (signal_value->>'is_simulated') IS DISTINCT FROM 'true';

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
          AND (vs.signal_value->>'is_simulated') IS DISTINCT FROM 'true'
    );

    -- Hours since last signal of any type
    SELECT EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600.0
    INTO v_last_signal_age_hours
    FROM public.validation_signals
    WHERE place_id = p_place_id
      AND (signal_value->>'is_simulated') IS DISTINCT FROM 'true';

    IF v_last_signal_age_hours IS NULL THEN
        v_last_signal_age_hours := 999;
    END IF;

    -- Time-Weighted Positive Signals in 24h
    SELECT 
        COUNT(*),
        COALESCE(SUM(EXP(-0.08 * (EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0))), 0)
    INTO v_positive_signal_count, v_weighted_positive
    FROM public.validation_signals
    WHERE place_id = p_place_id
      AND confidence_impact > 0
      AND created_at > (NOW() - INTERVAL '24 hours')
      AND (signal_value->>'is_simulated') IS DISTINCT FROM 'true';

    -- Total signals in 24h
    SELECT COUNT(*)
    INTO v_total_24h_signals
    FROM public.validation_signals
    WHERE place_id = p_place_id
      AND created_at > (NOW() - INTERVAL '24 hours')
      AND (signal_value->>'is_simulated') IS DISTINCT FROM 'true';

    -- ═══ Compute Signal Consensus Score (0–1) ═══
    -- Layer 1: Time-weighted consensus
    IF (v_weighted_closed + v_weighted_positive) = 0 THEN
        v_consensus_score := 0;
    ELSE
        -- Time-weighted ratio of closed vs (closed + positive)
        v_consensus_score := LEAST(1.0,
            (v_weighted_closed / (v_weighted_closed + v_weighted_positive))
            * (v_distinct_api_keys::FLOAT / GREATEST(v_distinct_api_keys, 1))
            * LEAST(v_avg_trust / v_trust_target, 1.0)
        );
    END IF;

    -- ═══ RULE 3 — Time Decay Escape ═══
    IF v_last_signal_age_hours >= 48 THEN
        v_collapse_allowed := TRUE;
        v_collapse_reason  := 'decay_override_no_activity';

    -- ═══ RULE 1 — Hard Collapse Conditions (Adaptive Threshold) ═══
    ELSIF v_closed_signal_count >= v_collapse_threshold
      AND v_distinct_api_keys >= 2
      AND v_avg_trust >= v_trust_target
    THEN
        v_collapse_allowed := TRUE;
        v_collapse_reason  := 'validated_closure_detected';

    -- ═══ RULE 4 — Partial Collapse (Uncertain) ═══
    ELSIF (v_closed_signal_count BETWEEN 1 AND (v_collapse_threshold - 1))
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
        'hours_since_last_signal', ROUND(v_last_signal_age_hours::NUMERIC, 1),
        'time_weighted_consensus', ROUND(v_consensus_score::NUMERIC, 3),
        'environment_type',      v_env_type::TEXT
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- 3. UPDATE INGEST_SIGNAL (Layer 3 & Time Weighting & Recovery)
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
    v_env_type           public.environment_type;
    v_is_recovery_mode   BOOLEAN := FALSE;
    v_max_rise           INT := 20;
    v_response_meta      JSONB;
BEGIN
    -- Ensure non-simulated signals only are processed if it was a simulated request it should fail earlier
    IF p_signal_value->>'is_simulated' = 'true' THEN
        RAISE EXCEPTION 'Simulated data cannot be ingested into the main pipeline.';
    END IF;

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

    v_env_type := public.update_place_behavior_profile(p_place_id);

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 2: PRE-INGESTION GUARDS
    -- ══════════════════════════════════════════════════════════════════════════
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

    -- Burst Protection
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

    -- Anti-Spam
    SELECT EXISTS (
        SELECT 1 FROM public.validation_signals
        WHERE place_id = p_place_id
          AND signal_type = p_signal_type::public.signal_type
          AND created_at > (NOW() - INTERVAL '2 minutes')
    ) INTO v_is_duplicate;

    IF v_is_duplicate THEN
        v_adjusted_impact := v_adjusted_impact * 0.7;
    END IF;

    -- Layer 3: Recovery Engine Detection
    SELECT COUNT(DISTINCT api_key_id), COUNT(DISTINCT signal_type)
    INTO v_unique_users, v_unique_types
    FROM public.validation_signals
    WHERE place_id = p_place_id;
    
    IF v_current_score < 30 AND v_adjusted_impact > 0 THEN
        IF v_unique_users >= 2 OR v_unique_types >= 2 THEN
            v_is_recovery_mode := TRUE;
            v_adjusted_impact := v_adjusted_impact * 1.5; -- Recovery boost
            v_max_rise := 15; -- Limit growth slope

            INSERT INTO public.activity_logs (place_id, event_type, event_meta)
            VALUES (p_place_id, 'RECOVERY_PROGRESS', jsonb_build_object(
                'current_score', v_current_score,
                'signal_type', p_signal_type,
                'boosted_impact', v_adjusted_impact
            ));
            
            -- If it was very low, emit started
            IF v_current_score < 20 THEN
                INSERT INTO public.activity_logs (place_id, event_type, event_meta)
                VALUES (p_place_id, 'RECOVERY_STARTED', jsonb_build_object(
                    'start_score', v_current_score
                ));
            END IF;
        END IF;
    END IF;

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 3: PERSIST THE SIGNAL
    -- ══════════════════════════════════════════════════════════════════════════
    INSERT INTO public.validation_signals (
        place_id, signal_type, signal_value, confidence_impact, user_id, source_type, api_key_id
    )
    VALUES (
        p_place_id, p_signal_type::public.signal_type, p_signal_value,
        v_adjusted_impact::INT, p_user_id, p_source_type, p_api_key_id
    );

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 4: SCORE COMPUTATION
    -- ══════════════════════════════════════════════════════════════════════════
    v_raw_new_score := GREATEST(0, LEAST(100,
        v_current_score + (v_adjusted_impact * (1.0 - v_current_score / 100.0))
    ));

    v_smoothed_score := (0.7 * v_current_score) + (0.3 * v_raw_new_score);

    IF (v_smoothed_score - v_current_score) < -25 THEN
        v_clamped_score := ROUND(v_current_score - 25);
        INSERT INTO public.activity_logs (place_id, event_type, event_meta)
        VALUES (p_place_id, 'SCORE_STABILIZED', jsonb_build_object(
            'clamped_from', v_smoothed_score,
            'clamped_to', v_clamped_score,
            'type', 'DROP_CLAMP'
        ));
    ELSIF (v_smoothed_score - v_current_score) > v_max_rise THEN
        v_clamped_score := ROUND(v_current_score + v_max_rise);
        INSERT INTO public.activity_logs (place_id, event_type, event_meta)
        VALUES (p_place_id, 'SCORE_STABILIZED', jsonb_build_object(
            'clamped_from', v_smoothed_score,
            'clamped_to', v_clamped_score,
            'type', 'RISE_CLAMP'
        ));
    ELSE
        v_clamped_score := ROUND(v_smoothed_score);
    END IF;

    -- Exit Recovery Mode Log
    IF v_is_recovery_mode AND v_clamped_score > 60 THEN
        INSERT INTO public.activity_logs (place_id, event_type, event_meta)
        VALUES (p_place_id, 'RECOVERY_COMPLETED', jsonb_build_object(
            'final_score', v_clamped_score
        ));
    END IF;

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 5: COLLAPSE CONTROL LAYER
    -- ══════════════════════════════════════════════════════════════════════════
    v_collapse_verdict := public.evaluate_collapse_eligibility(p_place_id);
    v_collapse_allowed := (v_collapse_verdict->>'collapse_allowed')::BOOLEAN;
    v_collapse_reason  := v_collapse_verdict->>'collapse_reason';
    v_consensus_score  := (v_collapse_verdict->>'time_weighted_consensus')::FLOAT;

    IF v_clamped_score < 20 THEN
        IF v_collapse_allowed THEN
            INSERT INTO public.activity_logs (place_id, event_type, event_meta)
            VALUES (p_place_id, 'COLLAPSE_PERMITTED', jsonb_build_object(
                'reason', v_collapse_reason,
                'consensus_score', v_consensus_score,
                'final_score', v_clamped_score,
                'verdict', v_collapse_verdict
            ));
        ELSE
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

    IF v_collapse_reason = 'partial_evidence_uncertain' THEN
        v_clamped_score := GREATEST(20, LEAST(40, v_clamped_score));
    END IF;

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 6: FINALIZE & PERSIST
    -- ══════════════════════════════════════════════════════════════════════════
    IF v_unique_users < 2 AND v_unique_types < 2 THEN
        v_clamped_score := LEAST(v_clamped_score, 75);
    END IF;

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

    -- Extend JSON response with Context/Time aware meta
    v_response_meta := jsonb_build_object(
        'time_weighted_consensus', v_consensus_score,
        'environment_type', v_env_type::TEXT,
        'recovery_state', v_is_recovery_mode
    );

    RETURN v_updated_place || v_response_meta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. UPDATE APPLY_SCORE_DECAY (Layer 2 - Adaptive Decay)
CREATE OR REPLACE FUNCTION public.apply_score_decay()
RETURNS TABLE(place_id UUID, old_score INT, new_score INT, hours_idle FLOAT, reason TEXT) AS $$
DECLARE
    v_now                  TIMESTAMPTZ := NOW();
    v_rec                  RECORD;
    v_last_signal          RECORD;
    v_hours_idle           FLOAT;
    v_decay_rate           FLOAT;
    v_decay_amount         INT;
    v_new_score            INT;
    v_has_negative         BOOLEAN;
    v_decay_reason         TEXT;
    v_env_type             public.environment_type;
BEGIN
    FOR v_rec IN
        SELECT p.id, p.confidence_score, p.last_validated_at
        FROM public.places p
        WHERE p.confidence_score > 0
          AND (
              p.last_validated_at IS NULL
              OR p.last_validated_at < (v_now - INTERVAL '6 hours')
          )
        FOR UPDATE SKIP LOCKED
    LOOP
        v_env_type := public.update_place_behavior_profile(v_rec.id);

        IF v_rec.last_validated_at IS NULL THEN
            v_hours_idle := 24.0;
        ELSE
            v_hours_idle := EXTRACT(EPOCH FROM (v_now - v_rec.last_validated_at)) / 3600.0;
        END IF;

        IF v_hours_idle < 6.0 THEN
            CONTINUE;
        ELSIF v_hours_idle < 24.0 THEN
            v_decay_rate := 1.0;
        ELSE
            v_decay_rate := 3.0;
        END IF;

        -- Environment Adaptive Decay Rule
        IF v_env_type = 'HIGH_ACTIVITY' THEN
            v_decay_rate := v_decay_rate * 1.5; -- Faster decay for high activity places
        ELSIF v_env_type = 'LOW_ACTIVITY' THEN
            v_decay_rate := v_decay_rate * 0.5; -- Slower decay for low activity places
        END IF;

        SELECT s.signal_type, s.confidence_impact, sw.freshness_weight INTO v_last_signal
        FROM public.validation_signals s
        LEFT JOIN public.signal_weights sw ON s.signal_type = sw.signal_type
        WHERE s.place_id = v_rec.id
        ORDER BY s.created_at DESC
        LIMIT 1;

        IF v_rec.confidence_score >= 80 THEN
            v_decay_rate := v_decay_rate * 0.5;
        ELSIF v_rec.confidence_score <= 40 THEN
            v_decay_rate := v_decay_rate * 1.5;
        END IF;

        IF NOT FOUND OR v_last_signal IS NULL OR v_last_signal.signal_type IS NULL THEN
            v_decay_rate := v_decay_rate * 2.0;
            v_decay_reason := 'no_signals_aggressive_decay';
        ELSE
            v_decay_rate := v_decay_rate * COALESCE(v_last_signal.freshness_weight, 1.0);
            
            IF v_last_signal.signal_type::TEXT = 'PICKUP_LOCATION_VERIFIED' THEN
                v_decay_reason := 'slow_decay_pickup_verified';
            ELSIF v_last_signal.signal_type::TEXT = 'FOOT_TRAFFIC' THEN
                v_decay_reason := 'medium_decay_foot_traffic';
            ELSE
                v_decay_reason := 'stale_' || ROUND(v_hours_idle::numeric, 0) || 'h';
            END IF;
        END IF;

        v_decay_amount := FLOOR((v_hours_idle - 6.0) * v_decay_rate);
        v_decay_amount := GREATEST(v_decay_amount, 1);
        
        v_new_score := v_rec.confidence_score - v_decay_amount;

        SELECT EXISTS (
            SELECT 1 FROM public.validation_signals 
            WHERE public.validation_signals.place_id = v_rec.id 
              AND confidence_impact < 0
        ) INTO v_has_negative;

        IF NOT v_has_negative THEN
            v_new_score := GREATEST(20, v_new_score);
        ELSE
            v_new_score := GREATEST(0, v_new_score);
        END IF;

        IF v_new_score >= v_rec.confidence_score THEN
            CONTINUE;
        END IF;

        INSERT INTO public.validation_signals (
            place_id, signal_type, signal_value, confidence_impact, user_id
        ) VALUES (
            v_rec.id, 'DECAY'::public.signal_type, 
            jsonb_build_object('decay_reason', v_decay_reason, 'hours_idle', ROUND(v_hours_idle::numeric, 1)),
            v_new_score - v_rec.confidence_score, 
            '00000000-0000-0000-0000-000000000000'::UUID
        );

        BEGIN
            INSERT INTO public.signal_events (
                place_id, signal_type, confidence_delta, score_before, score_after, metadata
            ) VALUES (
                v_rec.id, 'DECAY', v_new_score - v_rec.confidence_score, v_rec.confidence_score, v_new_score, 
                jsonb_build_object('decay_reason', v_decay_reason, 'hours_idle', ROUND(v_hours_idle::numeric, 1))
            );
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;

        UPDATE public.places
        SET confidence_score = v_new_score
        WHERE public.places.id = v_rec.id;

        place_id   := v_rec.id;
        old_score  := v_rec.confidence_score;
        new_score  := v_new_score;
        hours_idle := ROUND(v_hours_idle::NUMERIC, 1);
        reason     := v_decay_reason;
        RETURN NEXT;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
