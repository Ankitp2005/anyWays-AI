-- =============================================================================
-- Update Ingest Signal with source_type
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ingest_signal(
    p_place_id UUID,
    p_signal_type TEXT,
    p_signal_value JSONB,
    p_confidence_impact INT,
    p_user_id UUID,
    p_source_type TEXT DEFAULT 'INTERNAL'
) RETURNS JSONB AS $$
DECLARE
    v_current_score FLOAT;
    v_new_score INT;
    v_adjusted_impact FLOAT;
    v_is_duplicate BOOLEAN;
    v_updated_place JSONB;
    v_unique_users INT;
    v_unique_types INT;
BEGIN
    -- 1. Security & Ownership Check
    -- Lock the place row for update to ensure atomicity
    SELECT confidence_score INTO v_current_score
    FROM public.places 
    WHERE id = p_place_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Place not found or unauthorized';
    END IF;

    v_adjusted_impact := p_confidence_impact::FLOAT;

    -- 2. System Guardrail: Cap maximum impact
    v_adjusted_impact := LEAST(v_adjusted_impact, 45.0);

    -- 3. Negative Signal Damping (50% reduction)
    IF v_adjusted_impact < 0 THEN
        v_adjusted_impact := v_adjusted_impact * 0.5;
    END IF;

    -- 4. Anti-Spam Protection: 2-minute window check
    SELECT EXISTS (
        SELECT 1 FROM public.validation_signals
        WHERE place_id = p_place_id 
          AND signal_type = p_signal_type::public.signal_type
          AND created_at > (NOW() - INTERVAL '2 minutes')
    ) INTO v_is_duplicate;

    IF v_is_duplicate THEN
        v_adjusted_impact := v_adjusted_impact * 0.7;
    END IF;

    -- 5. Calculate Base New Score (Diminishing Returns Formula)
    v_new_score := ROUND(
        GREATEST(0, LEAST(100, 
            v_current_score + (v_adjusted_impact * (1.0 - v_current_score / 100.0))
        ))
    );

    -- 6. Atomic Persistence
    -- A. Insert the validation_signal record with source_type
    INSERT INTO public.validation_signals (
        place_id, 
        signal_type, 
        signal_value, 
        confidence_impact, 
        user_id,
        source_type
    )
    VALUES (
        p_place_id, 
        p_signal_type::public.signal_type, 
        p_signal_value, 
        v_adjusted_impact::INT,
        p_user_id,
        p_source_type
    );

    -- B. Multi-Source Validation Rule
    SELECT COUNT(DISTINCT user_id), COUNT(DISTINCT signal_type)
    INTO v_unique_users, v_unique_types
    FROM public.validation_signals
    WHERE place_id = p_place_id;

    -- Cap at 75 if single-source dominance (less than 2 unique API users and less than 2 signal types)
    IF v_unique_users < 2 AND v_unique_types < 2 THEN
        v_new_score := LEAST(v_new_score, 75);
    END IF;

    -- C. Insert into signal_events
    BEGIN
        INSERT INTO public.signal_events (
            place_id,
            signal_type,
            confidence_delta,
            score_before,
            score_after,
            metadata
        ) VALUES (
            p_place_id,
            p_signal_type,
            v_new_score - v_current_score::INT,
            v_current_score::INT,
            v_new_score,
            p_signal_value
        );
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;

    -- D. Update the place
    UPDATE public.places
    SET 
        confidence_score = v_new_score,
        unique_sources_count = v_unique_users,
        last_validated_at = NOW()
    WHERE id = p_place_id
    RETURNING row_to_json(places.*) INTO v_updated_place;

    -- E. Log history snapshot
    BEGIN
      INSERT INTO public.confidence_history (place_id, score)
      VALUES (p_place_id, v_new_score);
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;

    -- 7. Return the updated row
    RETURN v_updated_place;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
