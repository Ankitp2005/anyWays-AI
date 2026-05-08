-- =============================================================================
-- System: Weighted Scoring Logic
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.signal_weights (
    signal_type public.signal_type PRIMARY KEY,
    base_weight FLOAT NOT NULL,
    reliability_score FLOAT NOT NULL CHECK (reliability_score >= 0 AND reliability_score <= 1.0)
);

ALTER TABLE public.signal_weights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users on signal_weights" ON public.signal_weights;
CREATE POLICY "Enable read access for authenticated users on signal_weights" 
ON public.signal_weights FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable service role full access on signal_weights" ON public.signal_weights;
CREATE POLICY "Enable service role full access on signal_weights" 
ON public.signal_weights FOR ALL TO service_role USING (true);

INSERT INTO public.signal_weights (signal_type, base_weight, reliability_score) VALUES
    ('FOOT_TRAFFIC', 15, 0.8),
    ('OCR_MENU', 15, 0.7),
    ('SOCIAL_SENTIMENT', 8, 0.5),
    ('HOURS_VERIFIED', 10, 0.9),
    ('PHONE_VERIFIED', 8, 0.9),
    ('PICKUP_LOCATION_VERIFIED', 35, 0.95),
    ('CLOSED_DETECTED', -30, 0.9),
    ('LOW_TRAFFIC', -10, 0.7),
    ('GPS_ARRIVAL_VERIFIED', 25, 0.95),
    ('REAL_DWELL_TIME', 20, 0.9),
    ('DEVICE_VERIFIED_PRESENCE', 30, 0.98)
ON CONFLICT (signal_type) DO UPDATE SET
    base_weight = EXCLUDED.base_weight,
    reliability_score = EXCLUDED.reliability_score;
