-- Context-Aware Score Decay System
-- ==================

-- 1. Add DECAY to signal_type ENUM
ALTER TYPE public.signal_type ADD VALUE IF NOT EXISTS 'DECAY';

-- 2. Update apply_score_decay
DROP FUNCTION IF EXISTS public.apply_score_decay();

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
BEGIN
    -- Process places with score > 0 that haven't been validated in 6 hours
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
        -- Calculate idle hours
        IF v_rec.last_validated_at IS NULL THEN
            v_hours_idle := 24.0;
        ELSE
            v_hours_idle := EXTRACT(EPOCH FROM (v_now - v_rec.last_validated_at)) / 3600.0;
        END IF;

        -- 3. Time buckets
        IF v_hours_idle < 6.0 THEN
            CONTINUE; -- 0-6h -> no decay
        ELSIF v_hours_idle < 24.0 THEN
            v_decay_rate := 1.0; -- mild decay (base 1 pt/hr beyond 6h)
        ELSE
            v_decay_rate := 3.0; -- aggressive decay (base 3 pt/hr beyond 6h)
        END IF;

        -- Fetch last signal info
        SELECT * INTO v_last_signal
        FROM public.validation_signals
        WHERE public.validation_signals.place_id = v_rec.id
        ORDER BY created_at DESC
        LIMIT 1;

        -- 1. Weighted decay: High confidence decays slower, low faster
        IF v_rec.confidence_score >= 80 THEN
            v_decay_rate := v_decay_rate * 0.5;
        ELSIF v_rec.confidence_score <= 40 THEN
            v_decay_rate := v_decay_rate * 1.5;
        END IF;

        -- 2. Signal-aware decay
        IF FOUND AND v_last_signal.signal_type::TEXT IN ('PICKUP_LOCATION_VERIFIED', 'OCR_MENU', 'FOOT_TRAFFIC') AND v_last_signal.confidence_impact >= 5 THEN
            v_decay_rate := v_decay_rate * 0.5; -- slower decay
            v_decay_reason := 'stale_but_last_strong';
        ELSIF FOUND AND v_last_signal.confidence_impact < 5 AND v_last_signal.confidence_impact > 0 THEN
            v_decay_rate := v_decay_rate * 1.5; -- weak signals only
            v_decay_reason := 'stale_weak_signals';
        ELSE
            v_decay_reason := 'inactive_' || ROUND(v_hours_idle::numeric, 0) || 'h';
        END IF;

        -- Calculate amount (only for hours beyond the 6h threshold)
        v_decay_amount := FLOOR((v_hours_idle - 6.0) * v_decay_rate);
        v_decay_amount := GREATEST(v_decay_amount, 1); -- Guarantee at least 1 point of decay
        
        v_new_score := v_rec.confidence_score - v_decay_amount;

        -- 4. Floor rules: Never drop below 20 unless negative signal exists
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

        -- Guard: no actual change
        IF v_new_score >= v_rec.confidence_score THEN
            CONTINUE;
        END IF;

        -- 5 & 6. Log in validation_signals with signal_type = 'DECAY'
        INSERT INTO public.validation_signals (
            place_id, signal_type, signal_value, confidence_impact, user_id
        ) VALUES (
            v_rec.id, 'DECAY'::public.signal_type, 
            jsonb_build_object('decay_reason', v_decay_reason, 'hours_idle', ROUND(v_hours_idle::numeric, 1)),
            v_new_score - v_rec.confidence_score, 
            '00000000-0000-0000-0000-000000000000'::UUID -- system user
        );

        -- Also log in signal_events to maintain backwards compat with get_place_signal_history RPC
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

        -- Update the place
        UPDATE public.places
        SET confidence_score = v_new_score
        WHERE public.places.id = v_rec.id;

        -- Return affected rows
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


-- 3. Update run_score_decay
CREATE OR REPLACE FUNCTION public.run_score_decay()
RETURNS JSONB AS $$
DECLARE
    v_results JSONB;
    v_count   INT;
BEGIN
    SELECT 
        COALESCE(json_agg(row_to_json(d)), '[]'::JSON)::JSONB,
        COUNT(*)
    INTO v_results, v_count
    FROM public.apply_score_decay() d;

    RETURN jsonb_build_object(
        'decayed_count', v_count,
        'executed_at',   NOW()::TEXT,
        'details',       v_results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
