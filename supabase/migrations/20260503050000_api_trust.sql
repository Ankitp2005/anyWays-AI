-- =============================================================================
-- System Manipulation Prevention: API Key Trust
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.api_key_trust (
    api_key TEXT PRIMARY KEY,
    trust_score FLOAT NOT NULL DEFAULT 1.0 CHECK (trust_score >= 0 AND trust_score <= 1.0),
    total_signals INT NOT NULL DEFAULT 0,
    rejected_signals INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.api_key_trust ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable service role full access" ON public.api_key_trust;
CREATE POLICY "Enable service role full access" 
ON public.api_key_trust FOR ALL 
TO service_role 
USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_api_trust_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_api_trust_timestamp ON public.api_key_trust;
CREATE TRIGGER trigger_update_api_trust_timestamp
BEFORE UPDATE ON public.api_key_trust
FOR EACH ROW EXECUTE FUNCTION update_api_trust_timestamp();
