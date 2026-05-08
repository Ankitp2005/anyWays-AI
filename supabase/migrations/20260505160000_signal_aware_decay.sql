-- =============================================================================
-- Signal-Aware Contextual Decay
-- =============================================================================

-- 1. Add freshness_weight to signal_weights
ALTER TABLE public.signal_weights ADD COLUMN IF NOT EXISTS freshness_weight FLOAT DEFAULT 1.0;

-- 2. Set specific decay weights based on signal type
-- PICKUP_LOCATION_VERIFIED -> slow decay (e.g., 0.25)
UPDATE public.signal_weights SET freshness_weight = 0.25 WHERE signal_type = 'PICKUP_LOCATION_VERIFIED';

-- FOOT_TRAFFIC -> medium decay (e.g., 0.75)
UPDATE public.signal_weights SET freshness_weight = 0.75 WHERE signal_type = 'FOOT_TRAFFIC';

-- 3. Update apply_score_decay to use dynamic signal-aware logic
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

        -- Fetch last signal info and its freshness weight
        SELECT s.signal_type, s.confidence_impact, sw.freshness_weight INTO v_last_signal
        FROM public.validation_signals s
        LEFT JOIN public.signal_weights sw ON s.signal_type = sw.signal_type
        WHERE s.place_id = v_rec.id
        ORDER BY s.created_at DESC
        LIMIT 1;

        -- 1. Weighted decay: High confidence decays slower, low faster
        IF v_rec.confidence_score >= 80 THEN
            v_decay_rate := v_decay_rate * 0.5;
        ELSIF v_rec.confidence_score <= 40 THEN
            v_decay_rate := v_decay_rate * 1.5;
        END IF;

        -- 2. Signal-aware decay
        IF NOT FOUND OR v_last_signal IS NULL OR v_last_signal.signal_type IS NULL THEN
            -- No signals -> aggressive decay
            v_decay_rate := v_decay_rate * 2.0;
            v_decay_reason := 'no_signals_aggressive_decay';
        ELSE
            -- Apply dynamic freshness weight from signal_weights
            v_decay_rate := v_decay_rate * COALESCE(v_last_signal.freshness_weight, 1.0);
            
            IF v_last_signal.signal_type::TEXT = 'PICKUP_LOCATION_VERIFIED' THEN
                v_decay_reason := 'slow_decay_pickup_verified';
            ELSIF v_last_signal.signal_type::TEXT = 'FOOT_TRAFFIC' THEN
                v_decay_reason := 'medium_decay_foot_traffic';
            ELSE
                v_decay_reason := 'stale_' || ROUND(v_hours_idle::numeric, 0) || 'h';
            END IF;
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
