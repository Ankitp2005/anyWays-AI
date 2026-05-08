-- =============================================================================
-- Ground Truth: Score Calibration
-- =============================================================================

-- 1. Create table for score calibration buckets
CREATE TABLE IF NOT EXISTS public.score_calibration (
    score_min INT NOT NULL,
    score_max INT NOT NULL,
    success_rate FLOAT NOT NULL,
    sample_size INT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (score_min, score_max)
);

-- RLS
ALTER TABLE public.score_calibration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users on score_calibration" ON public.score_calibration;
CREATE POLICY "Enable read access for authenticated users on score_calibration" 
ON public.score_calibration FOR SELECT 
TO authenticated 
USING (true);

-- 2. Function to compute and update buckets
CREATE OR REPLACE FUNCTION recalibrate_scores()
RETURNS VOID AS $$
BEGIN
    -- Delete existing data
    TRUNCATE public.score_calibration;

    -- Insert new calculated buckets
    WITH buckets AS (
        SELECT 
            CASE 
                WHEN predicted_score BETWEEN 0 AND 20 THEN 0
                WHEN predicted_score BETWEEN 21 AND 40 THEN 21
                WHEN predicted_score BETWEEN 41 AND 60 THEN 41
                WHEN predicted_score BETWEEN 61 AND 80 THEN 61
                WHEN predicted_score BETWEEN 81 AND 100 THEN 81
            END as score_min,
            CASE 
                WHEN predicted_score BETWEEN 0 AND 20 THEN 20
                WHEN predicted_score BETWEEN 21 AND 40 THEN 40
                WHEN predicted_score BETWEEN 41 AND 60 THEN 60
                WHEN predicted_score BETWEEN 61 AND 80 THEN 80
                WHEN predicted_score BETWEEN 81 AND 100 THEN 100
            END as score_max,
            COUNT(*) as total_samples,
            COUNT(*) FILTER (WHERE actual_outcome = 'SUCCESS') as success_samples
        FROM public.delivery_attempts
        GROUP BY 1, 2
    )
    INSERT INTO public.score_calibration (score_min, score_max, success_rate, sample_size)
    SELECT 
        score_min, 
        score_max, 
        ROUND((success_samples::FLOAT / total_samples)::NUMERIC, 2), 
        total_samples
    FROM buckets
    WHERE total_samples >= 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to compute real probability for a given score
CREATE OR REPLACE FUNCTION get_real_probability(p_score INT)
RETURNS FLOAT AS $$
DECLARE
    v_prob FLOAT;
BEGIN
    SELECT success_rate INTO v_prob
    FROM public.score_calibration
    WHERE p_score BETWEEN score_min AND score_max
    LIMIT 1;

    -- Fallback strategy if bucket has < 10 samples and doesn't exist
    IF v_prob IS NULL THEN
        RETURN ROUND((p_score::FLOAT / 100.0)::NUMERIC, 2);
    END IF;

    RETURN v_prob;
END;
$$ LANGUAGE plpgsql STABLE;

-- Optional: Initial trigger or seed data
INSERT INTO public.score_calibration (score_min, score_max, success_rate, sample_size)
VALUES 
    (0, 20, 0.05, 100),
    (21, 40, 0.25, 100),
    (41, 60, 0.50, 100),
    (61, 80, 0.80, 100),
    (81, 100, 0.98, 100)
ON CONFLICT DO NOTHING;
