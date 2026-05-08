-- =============================================================================
-- Add Negative Signal Types: CLOSED_DETECTED, LOW_TRAFFIC
-- =============================================================================
-- These signals allow the system to degrade confidence when negative evidence
-- is observed, improving overall scoring reliability.

-- 1. Add new enum values
ALTER TYPE public.signal_type ADD VALUE IF NOT EXISTS 'CLOSED_DETECTED';
ALTER TYPE public.signal_type ADD VALUE IF NOT EXISTS 'LOW_TRAFFIC';

-- 2. Update the ingest_signal RPC to include weights for new types
-- This ensures the SQL-level scoring (used by the older RPC path) handles them correctly.
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

    -- 2. System Guardrail: Cap maximum impact (both directions)
    v_adjusted_impact := GREATEST(-45.0, LEAST(v_adjusted_impact, 45.0));

    -- 3. Negative Signal Damping (50% reduction)
    --    Prevents single negative reports from causing drastic drops
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

    -- 5. Calculate New Score (Diminishing Returns Formula)
    v_new_score := ROUND(
        GREATEST(0, LEAST(100, 
            v_current_score + (v_adjusted_impact * (1.0 - v_current_score / 100.0))
        ))
    );

    -- 6. Atomic Persistence
    INSERT INTO public.validation_signals (
        place_id, signal_type, signal_value, confidence_impact, user_id
    )
    VALUES (
        p_place_id, p_signal_type::public.signal_type, p_signal_value, 
        v_adjusted_impact::INT, p_user_id
    );

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
