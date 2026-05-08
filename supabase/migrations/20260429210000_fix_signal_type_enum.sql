-- =============================================================================
-- FIX: Add PICKUP_LOCATION_VERIFIED to ENUM and fix RPC type casting
-- =============================================================================

-- 1. Add the new value to the ENUM type
-- Note: ALTER TYPE ... ADD VALUE cannot be executed inside a transaction block in some versions of Postgres,
-- but Supabase migrations handle this correctly.
ALTER TYPE public.signal_type ADD VALUE IF NOT EXISTS 'PICKUP_LOCATION_VERIFIED';

-- 2. Re-create the RPC with proper type casting for the ENUM
CREATE OR REPLACE FUNCTION ingest_signal(
    p_place_id UUID,
    p_signal_type TEXT,
    p_signal_value JSONB,
    p_confidence_impact INT,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_new_score INT;
    v_updated_place JSONB;
BEGIN
    -- Step 1: Verify Ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.places 
        WHERE id = p_place_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Place not found or unauthorized';
    END IF;

    -- Step 2: Insert the signal (casting TEXT parameter to our custom ENUM type)
    INSERT INTO public.validation_signals (place_id, signal_type, signal_value, confidence_impact)
    VALUES (p_place_id, p_signal_type::public.signal_type, p_signal_value, p_confidence_impact);

    -- Step 3: Calculate new confidence score
    WITH SignalScores AS (
        SELECT 
            confidence_impact,
            signal_type,
            EXTRACT(EPOCH FROM (now() - detected_at)) / 86400.0 AS days_elapsed,
            CASE signal_type::TEXT
                WHEN 'OCR_MENU' THEN 1.00
                WHEN 'PICKUP_LOCATION_VERIFIED' THEN 0.95
                WHEN 'HOURS_VERIFIED' THEN 0.90
                WHEN 'FOOT_TRAFFIC' THEN 0.80
                WHEN 'PHONE_VERIFIED' THEN 0.70
                WHEN 'SOCIAL_SENTIMENT' THEN 0.30
                ELSE 0.50
            END as type_weight
        FROM public.validation_signals
        WHERE place_id = p_place_id
    ),
    BaseCalc AS (
        SELECT 
            SUM(confidence_impact * type_weight * EXP(-(0.023104906) * GREATEST(0, days_elapsed))) AS base_score,
            COUNT(DISTINCT signal_type) as distinct_types
        FROM SignalScores
    )
    SELECT 
        GREATEST(0, LEAST(100, ROUND(base_score + CASE WHEN distinct_types >= 3 THEN 5 ELSE 0 END)))
    INTO v_new_score
    FROM BaseCalc;

    v_new_score := COALESCE(v_new_score, 0);

    -- Step 4: Update the place
    UPDATE public.places
    SET 
        confidence_score = v_new_score,
        last_validated_at = NOW()
    WHERE id = p_place_id
    RETURNING row_to_json(places.*) INTO v_updated_place;

    -- Step 5: Log history snapshot
    INSERT INTO public.confidence_history (place_id, score)
    VALUES (p_place_id, v_new_score);

    -- Return the updated row
    RETURN v_updated_place;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
