-- =============================================================================
-- API Key Trust: Increment RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_api_trust(p_api_key TEXT, p_rejected BOOLEAN)
RETURNS FLOAT AS $$
DECLARE
    v_trust_score FLOAT;
BEGIN
    INSERT INTO public.api_key_trust (api_key, total_signals, rejected_signals, trust_score)
    VALUES (
        p_api_key, 
        CASE WHEN p_rejected THEN 0 ELSE 1 END, 
        CASE WHEN p_rejected THEN 1 ELSE 0 END,
        1.0
    )
    ON CONFLICT (api_key) DO UPDATE SET
        total_signals = api_key_trust.total_signals + (CASE WHEN p_rejected THEN 0 ELSE 1 END),
        rejected_signals = api_key_trust.rejected_signals + (CASE WHEN p_rejected THEN 1 ELSE 0 END),
        -- simple penalty: reduce trust if rejected ratio goes up, but for now we just return current
        trust_score = GREATEST(0.1, 1.0 - ( (api_key_trust.rejected_signals + (CASE WHEN p_rejected THEN 1 ELSE 0 END))::FLOAT / NULLIF(api_key_trust.total_signals + api_key_trust.rejected_signals + 1, 0) ))
    RETURNING trust_score INTO v_trust_score;

    RETURN v_trust_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
