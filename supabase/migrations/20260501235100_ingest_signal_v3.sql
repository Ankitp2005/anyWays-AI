-- Ingest Signal V3: Incremental Scoring
-- This RPC replaces the historical recalculation logic with a simpler,
-- faster incremental update. It accepts a pre-calculated score from the 
-- Edge Function and handles the atomic persistence.

CREATE OR REPLACE FUNCTION ingest_signal_v3(
    p_place_id UUID,
    p_signal_type TEXT,
    p_signal_value JSONB,
    p_confidence_impact INT,
    p_new_score INT,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_updated_place JSONB;
BEGIN
    -- 1. Insert the signal
    INSERT INTO public.validation_signals (
        place_id, 
        signal_type, 
        signal_value, 
        confidence_impact, 
        user_id
    )
    VALUES (
        p_place_id, 
        p_signal_type::public.signal_type, 
        p_signal_value, 
        p_confidence_impact, 
        p_user_id
    );

    -- 2. Update the place with pre-calculated score
    UPDATE public.places
    SET 
        confidence_score = p_new_score,
        last_validated_at = NOW()
    WHERE id = p_place_id AND user_id = p_user_id
    RETURNING row_to_json(places.*) INTO v_updated_place;

    -- 3. Check if update happened (ownership check)
    IF v_updated_place IS NULL THEN
        RAISE EXCEPTION 'Place not found or unauthorized';
    END IF;

    -- 4. Log history snapshot
    BEGIN
      INSERT INTO public.confidence_history (place_id, score)
      VALUES (p_place_id, p_new_score);
    EXCEPTION WHEN undefined_table THEN
      -- table might not exist in all environments, ignore
    END;

    RETURN v_updated_place;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
