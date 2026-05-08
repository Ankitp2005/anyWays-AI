-- =============================================================================
-- Upgrade Negative Signal Impact & Recovery Logic
-- =============================================================================

CREATE OR REPLACE FUNCTION ingest_signal(
    p_place_id UUID,
    p_signal_type TEXT,
    p_signal_value JSONB,
    p_confidence_impact INT,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_current_score FLOAT;
    v_new_score INT;
    v_adjusted_impact FLOAT;
    v_is_duplicate BOOLEAN;
    v_updated_place JSONB;
    v_last_closed_at TIMESTAMPTZ;
    v_strong_positives INT;
    v_score_cap INT := 100;
BEGIN
    -- 1. Security & Ownership Check
    SELECT confidence_score INTO v_current_score
    FROM public.places 
    WHERE id = p_place_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Place not found or unauthorized';
    END IF;

    v_adjusted_impact := p_confidence_impact::FLOAT;

    -- 2. Strong penalties for negative signals (override caller impact)
    IF p_signal_type = 'CLOSED_DETECTED' THEN
        v_adjusted_impact := LEAST(v_adjusted_impact, -30.0);
    ELSIF p_signal_type = 'LOW_TRAFFIC' THEN
        v_adjusted_impact := LEAST(v_adjusted_impact, -10.0);
    ELSE
        -- Negative Signal Damping (50% reduction) for other negative signals
        IF v_adjusted_impact < 0 THEN
            v_adjusted_impact := v_adjusted_impact * 0.5;
        END IF;
    END IF;

    -- System Guardrail: Cap maximum impact
    v_adjusted_impact := GREATEST(-50.0, LEAST(v_adjusted_impact, 45.0));

    -- 3. Anti-Spam Protection: 2-minute window check
    SELECT EXISTS (
        SELECT 1 FROM public.validation_signals
        WHERE place_id = p_place_id 
          AND signal_type = p_signal_type::public.signal_type
          AND created_at > (NOW() - INTERVAL '2 minutes')
    ) INTO v_is_duplicate;

    IF v_is_duplicate THEN
        v_adjusted_impact := v_adjusted_impact * 0.7;
    END IF;

    -- 4. Calculate New Score (Diminishing Returns Formula)
    v_new_score := ROUND(
        GREATEST(0, LEAST(100, 
            v_current_score + (v_adjusted_impact * (1.0 - v_current_score / 100.0))
        ))
    );

    -- 5. Recovery Logic & Confidence Override
    -- Find the last CLOSED_DETECTED signal
    SELECT created_at INTO v_last_closed_at
    FROM public.validation_signals
    WHERE place_id = p_place_id AND signal_type = 'CLOSED_DETECTED'
    ORDER BY created_at DESC LIMIT 1;

    IF FOUND THEN
        -- Count strong positive signals since the closure
        SELECT COUNT(*) INTO v_strong_positives
        FROM public.validation_signals
        WHERE place_id = p_place_id 
          AND confidence_impact >= 5 
          AND created_at > v_last_closed_at;
          
        -- Add the current signal if it's a strong positive
        IF v_adjusted_impact >= 5.0 AND p_signal_type != 'CLOSED_DETECTED' THEN
            v_strong_positives := v_strong_positives + 1;
        END IF;

        -- Require at least 2 strong positives to recover from CLOSED
        IF v_strong_positives < 2 THEN
            v_score_cap := 50;
        END IF;
    END IF;

    -- Apply the cap (if currently CLOSED_DETECTED, the cap applies immediately)
    IF p_signal_type = 'CLOSED_DETECTED' THEN
        v_score_cap := 50;
    END IF;

    v_new_score := LEAST(v_new_score, v_score_cap);

    -- 6. Atomic Persistence
    INSERT INTO public.validation_signals (
        place_id, signal_type, signal_value, confidence_impact, user_id
    )
    VALUES (
        p_place_id, p_signal_type::public.signal_type, p_signal_value, 
        v_adjusted_impact::INT, p_user_id
    );

    -- Log in signal_events (for backwards compat)
    BEGIN
        INSERT INTO public.signal_events (
            place_id, signal_type, confidence_delta, score_before, score_after, metadata
        ) VALUES (
            p_place_id, p_signal_type, v_adjusted_impact::INT, v_current_score::INT, v_new_score, p_signal_value
        );
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;

    UPDATE public.places
    SET 
        confidence_score = v_new_score,
        last_validated_at = NOW()
    WHERE id = p_place_id
    RETURNING row_to_json(places.*) INTO v_updated_place;

    -- 7. Log history snapshot
    BEGIN
      INSERT INTO public.confidence_history (place_id, score)
      VALUES (p_place_id, v_new_score);
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;

    RETURN v_updated_place;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
