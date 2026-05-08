-- Create api_usage_metrics table for aggregated usage statistics
CREATE TABLE IF NOT EXISTS public.api_usage_metrics (
    api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    request_count BIGINT DEFAULT 1,
    last_request_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (api_key_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.api_usage_metrics ENABLE ROW LEVEL SECURITY;

-- Service role can manage all metrics
DROP POLICY IF EXISTS "Service role can manage api_usage_metrics" ON public.api_usage_metrics;
CREATE POLICY "Service role can manage api_usage_metrics" 
ON public.api_usage_metrics 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Function for atomic increment of API metrics
CREATE OR REPLACE FUNCTION public.increment_api_metric(p_key_id UUID, p_endpoint TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.api_usage_metrics (api_key_id, endpoint, request_count, last_request_at)
    VALUES (p_key_id, p_endpoint, 1, NOW())
    ON CONFLICT (api_key_id, endpoint)
    DO UPDATE SET 
        request_count = public.api_usage_metrics.request_count + 1,
        last_request_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_metrics_last_request ON public.api_usage_metrics(last_request_at DESC);

-- Comment for clarity
COMMENT ON TABLE public.api_usage_metrics IS 'Aggregated endpoint usage metrics per API key, updated in real-time.';
