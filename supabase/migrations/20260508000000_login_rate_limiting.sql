-- Login Rate Limiting Table
-- Tracks attempts by IP or User Email to prevent brute force.

CREATE TABLE IF NOT EXISTS public.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- IP address or Email
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast cleanup and lookups
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_time ON public.login_attempts(identifier, attempted_at);

-- Function: check_login_rate_limit
-- 5 attempts per 15 minutes
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(p_identifier TEXT)
RETURNS JSONB AS $$
DECLARE
    v_count INTEGER;
    v_window_min INTEGER := 15;
    v_max_attempts INTEGER := 5;
    v_allowed BOOLEAN := TRUE;
BEGIN
    -- Count attempts in the last 15 minutes
    SELECT count(*) INTO v_count
    FROM public.login_attempts
    WHERE identifier = p_identifier
    AND attempted_at > NOW() - (v_window_min * interval '1 minute');

    IF v_count >= v_max_attempts THEN
        v_allowed := FALSE;
    ELSE
        -- Record this attempt
        INSERT INTO public.login_attempts (identifier) VALUES (p_identifier);
    END IF;

    RETURN jsonb_build_object(
        'allowed', v_allowed,
        'attempts', v_count + 1,
        'limit', v_max_attempts,
        'window_min', v_window_min
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup Cron (Optional but recommended)
-- DELETE FROM public.login_attempts WHERE attempted_at < NOW() - interval '24 hours';
