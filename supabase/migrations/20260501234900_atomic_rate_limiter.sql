-- Atomic Token Bucket Rate Limiter
-- This function handles the refill logic and token deduction in a single transaction.
-- Prevents race conditions where two simultaneous requests could over-consume tokens.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key TEXT,
    p_path TEXT,
    p_capacity INTEGER,
    p_refill_rate FLOAT
) RETURNS JSONB AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_tokens INTEGER;
    v_last_refill TIMESTAMPTZ;
    v_seconds_elapsed FLOAT;
    v_refilled_tokens INTEGER;
    v_allowed BOOLEAN := FALSE;
    v_remaining INTEGER;
BEGIN
    -- 1. Lock the row for the specific key/path to ensure atomicity
    -- If it doesn't exist, we'll create it later.
    SELECT tokens, last_refill INTO v_tokens, v_last_refill
    FROM public.rate_limits
    WHERE key = p_key AND path = p_path
    FOR UPDATE;

    -- 2. Handle missing bucket (Initialization)
    IF NOT FOUND THEN
        v_tokens := p_capacity - 1; -- Deduct the first token
        v_remaining := v_tokens;
        v_allowed := TRUE;

        INSERT INTO public.rate_limits (key, path, tokens, last_refill)
        VALUES (p_key, p_path, v_tokens, v_now);
    ELSE
        -- 3. Calculate refill
        v_seconds_elapsed := EXTRACT(EPOCH FROM (v_now - v_last_refill));
        v_refilled_tokens := LEAST(p_capacity, v_tokens + FLOOR(v_seconds_elapsed * p_refill_rate));

        -- 4. Check allowance
        IF v_refilled_tokens >= 1 THEN
            v_allowed := TRUE;
            v_remaining := v_refilled_tokens - 1;
            
            -- Only update last_refill if we actually refilled something
            -- to avoid losing fractional tokens on high-frequency requests.
            UPDATE public.rate_limits
            SET tokens = v_remaining,
                last_refill = CASE WHEN v_seconds_elapsed * p_refill_rate >= 1 THEN v_now ELSE v_last_refill END
            WHERE key = p_key AND path = p_path;
        ELSE
            v_allowed := FALSE;
            v_remaining := 0;
        END IF;
    END IF;

    -- 5. Return result as JSONB
    RETURN jsonb_build_object(
        'allowed', v_allowed,
        'remaining', v_remaining,
        'limit', p_capacity,
        'reset_at', (v_now + (p_capacity::FLOAT / p_refill_rate) * interval '1 second')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
