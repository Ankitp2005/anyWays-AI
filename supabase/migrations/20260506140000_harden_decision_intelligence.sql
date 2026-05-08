-- Hardening Decision Intelligence
-- 1. Update ingest_signal with Stabilization, Trust Rate Limiting, and Burst Protection

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
    v_current_score FLOAT;
    v_raw_new_score FLOAT;
    v_smoothed_score FLOAT;
    v_clamped_score INT;
    v_adjusted_impact FLOAT;
    v_is_duplicate BOOLEAN;
    v_updated_place JSONB;
    v_unique_users INT;
    v_unique_types INT;
    v_burst_count INT;
    v_hourly_key_count INT;
    v_signals_24h INT;
BEGIN
    -- 1. Security & Lock
    SELECT confidence_score INTO v_current_score
    FROM public.places 
    WHERE id = p_place_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Place not found or unauthorized';
    END IF;

    -- 2. Task 2: Trust Rate Limiting
    -- Max 3 signals per API key per place per hour
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

    -- 3. Task 4: Burst Protection
    -- If >5 negative signals in last 5 mins -> reduce weight by 50%
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

    -- 4. Anti-Spam (already in system)
    SELECT EXISTS (
        SELECT 1 FROM public.validation_signals
        WHERE place_id = p_place_id 
          AND signal_type = p_signal_type::public.signal_type
          AND created_at > (NOW() - INTERVAL '2 minutes')
    ) INTO v_is_duplicate;

    IF v_is_duplicate THEN
        v_adjusted_impact := v_adjusted_impact * 0.7;
    END IF;

    -- 5. Task 1: Score Stabilization Layer
    -- A. Raw Predicted Score
    v_raw_new_score := GREATEST(0, LEAST(100, 
        v_current_score + (v_adjusted_impact * (1.0 - v_current_score / 100.0))
    ));

    -- B. Smoothing: (0.7 * previous) + (0.3 * computed)
    v_smoothed_score := (0.7 * v_current_score) + (0.3 * v_raw_new_score);

    -- C. Clamping (Max drop -25, Max rise +20)
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

    -- D. Minimum Floor (20 if signals in last 24h)
    SELECT COUNT(*) INTO v_signals_24h
    FROM public.validation_signals
    WHERE place_id = p_place_id AND created_at > (NOW() - INTERVAL '24 hours');

    IF v_signals_24h > 0 THEN
        v_clamped_score := GREATEST(v_clamped_score, 20);
    END IF;

    -- 6. Persistence
    INSERT INTO public.validation_signals (
        place_id, signal_type, signal_value, confidence_impact, user_id, source_type, api_key_id
    )
    VALUES (
        p_place_id, p_signal_type::public.signal_type, p_signal_value, v_adjusted_impact::INT, p_user_id, p_source_type, p_api_key_id
    );

    SELECT COUNT(DISTINCT user_id), COUNT(DISTINCT signal_type)
    INTO v_unique_users, v_unique_types
    FROM public.validation_signals
    WHERE place_id = p_place_id;

    -- Legacy single-source cap
    IF v_unique_users < 2 AND v_unique_types < 2 THEN
        v_clamped_score := LEAST(v_clamped_score, 75);
    END IF;

    -- History Tracking
    INSERT INTO public.signal_events (
        place_id, signal_type, confidence_delta, score_before, score_after, metadata
    ) VALUES (
        p_place_id, p_signal_type, v_clamped_score - v_current_score::INT, v_current_score::INT, v_clamped_score, p_signal_value
    );

    UPDATE public.places
    SET 
        confidence_score = v_clamped_score,
        unique_sources_count = v_unique_users,
        last_validated_at = NOW()
    WHERE id = p_place_id
    RETURNING row_to_json(places.*) INTO v_updated_place;

    RETURN v_updated_place;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
