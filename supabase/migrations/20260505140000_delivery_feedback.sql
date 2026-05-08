-- =============================================================================
-- Delivery Feedback System: Mark Signals
-- =============================================================================

-- 1. Add is_correct column to validation_signals
DO $$ BEGIN
    ALTER TABLE public.validation_signals ADD COLUMN is_correct BOOLEAN DEFAULT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. Update log_delivery_attempt RPC to also mark signals
CREATE OR REPLACE FUNCTION public.log_delivery_attempt(
    p_place_id UUID,
    p_predicted_score INT,
    p_predicted_label TEXT,
    p_actual_outcome public.delivery_outcome,
    p_failure_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    -- Insert the delivery attempt
    INSERT INTO public.delivery_attempts (
        place_id, 
        predicted_score, 
        predicted_label, 
        actual_outcome, 
        failure_reason
    ) VALUES (
        p_place_id, 
        p_predicted_score, 
        p_predicted_label, 
        p_actual_outcome, 
        p_failure_reason
    ) RETURNING id INTO v_id;
    
    -- Logic for marking signals based on outcome
    -- SUCCESS -> correct positive signals
    IF p_actual_outcome = 'SUCCESS' THEN
        UPDATE public.validation_signals
        SET is_correct = TRUE
        WHERE place_id = p_place_id 
          AND confidence_impact > 0
          AND is_correct IS NULL
          AND detected_at >= NOW() - INTERVAL '30 days';
          
    -- FAILED -> wrong assumptions (positive signals were wrong)
    ELSIF p_actual_outcome = 'FAILED' THEN
        UPDATE public.validation_signals
        SET is_correct = FALSE
        WHERE place_id = p_place_id 
          AND confidence_impact > 0
          AND is_correct IS NULL
          AND detected_at >= NOW() - INTERVAL '30 days';
          
    -- CLOSED -> critical negative validation (positive signals wrong, negative signals right)
    ELSIF p_actual_outcome = 'CLOSED' THEN
        -- Positive signals were wrong
        UPDATE public.validation_signals
        SET is_correct = FALSE
        WHERE place_id = p_place_id 
          AND confidence_impact > 0
          AND is_correct IS NULL
          AND detected_at >= NOW() - INTERVAL '30 days';
          
        -- Negative signals were correct
        UPDATE public.validation_signals
        SET is_correct = TRUE
        WHERE place_id = p_place_id 
          AND confidence_impact < 0
          AND is_correct IS NULL
          AND detected_at >= NOW() - INTERVAL '30 days';
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.log_delivery_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_delivery_attempt TO service_role;
