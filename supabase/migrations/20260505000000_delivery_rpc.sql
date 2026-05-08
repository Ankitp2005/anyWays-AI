-- =============================================================================
-- Delivery Attempts: RPC Integration
-- =============================================================================

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
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.log_delivery_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_delivery_attempt TO service_role;
