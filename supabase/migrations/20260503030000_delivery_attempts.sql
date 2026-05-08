-- =============================================================================
-- Ground Truth Tracking: Delivery Attempts
-- =============================================================================

-- 1. Create ENUM for actual outcome
DO $$ BEGIN
    CREATE TYPE public.delivery_outcome AS ENUM ('SUCCESS', 'FAILED', 'CLOSED', 'UNKNOWN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create the delivery_attempts table
CREATE TABLE IF NOT EXISTS public.delivery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    predicted_score INT NOT NULL,
    predicted_label TEXT,
    actual_outcome public.delivery_outcome NOT NULL DEFAULT 'UNKNOWN',
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create indexes for performance on (place_id) and (created_at)
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_place_id ON public.delivery_attempts(place_id);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_created_at ON public.delivery_attempts(created_at);

-- 4. Enable Row Level Security
ALTER TABLE public.delivery_attempts ENABLE ROW LEVEL SECURITY;

-- 5. Add Policies
DROP POLICY IF EXISTS "Enable insert for authenticated users on delivery_attempts" ON public.delivery_attempts;
CREATE POLICY "Enable insert for authenticated users on delivery_attempts" 
ON public.delivery_attempts FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users on delivery_attempts" ON public.delivery_attempts;
CREATE POLICY "Enable read access for authenticated users on delivery_attempts" 
ON public.delivery_attempts FOR SELECT 
TO authenticated 
USING (true);

