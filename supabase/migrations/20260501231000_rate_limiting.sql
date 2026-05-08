-- Create rate_limits table for Token Bucket rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT NOT NULL,
    path TEXT NOT NULL,
    tokens INTEGER NOT NULL,
    last_refill TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (key, path)
);

-- Enable RLS (Row Level Security)
-- This table is internal and should only be accessed via service_role by default.
-- We don't want users querying their own rate limits directly for now to prevent probing.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
DROP POLICY IF EXISTS "Service role can manage all rate limits" ON public.rate_limits;
CREATE POLICY "Service role can manage all rate limits" 
ON public.rate_limits 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_path ON public.rate_limits(key, path);

-- Comment for clarity
COMMENT ON TABLE public.rate_limits IS 'Stores token bucket state for API rate limiting across Edge Functions.';
