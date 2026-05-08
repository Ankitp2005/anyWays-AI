-- =============================================================================
-- Score Calibration System
-- =============================================================================

-- 1. Create table for score calibration buckets (overriding previous if any)
DROP TABLE IF EXISTS public.score_calibration CASCADE;

CREATE TABLE public.score_calibration (
    score_bucket TEXT PRIMARY KEY,
    success_rate FLOAT NOT NULL,
    total_samples INT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.score_calibration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users on score_calibration" 
ON public.score_calibration FOR SELECT 
TO authenticated 
USING (true);

-- 2. Aggregation function
CREATE OR REPLACE FUNCTION public.recalibrate_scores()
RETURNS VOID AS $$
BEGIN
    TRUNCATE public.score_calibration;

    WITH buckets AS (
        SELECT 
            CASE 
                WHEN predicted_score BETWEEN 0 AND 20 THEN '0-20'
                WHEN predicted_score BETWEEN 21 AND 40 THEN '21-40'
                WHEN predicted_score BETWEEN 41 AND 60 THEN '41-60'
                WHEN predicted_score BETWEEN 61 AND 80 THEN '61-80'
                WHEN predicted_score BETWEEN 81 AND 100 THEN '81-100'
            END as score_bucket,
            COUNT(*) as total_samples,
            COUNT(*) FILTER (WHERE actual_outcome = 'SUCCESS') as success_samples
        FROM public.delivery_attempts
        GROUP BY 1
    )
    INSERT INTO public.score_calibration (score_bucket, success_rate, total_samples)
    SELECT 
        score_bucket, 
        ROUND((success_samples::FLOAT / total_samples)::NUMERIC, 2), 
        total_samples
    FROM buckets
    WHERE total_samples > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to get real probability
CREATE OR REPLACE FUNCTION public.get_real_probability(p_score INT)
RETURNS FLOAT AS $$
DECLARE
    v_bucket TEXT;
    v_prob FLOAT;
BEGIN
    v_bucket := CASE 
        WHEN p_score BETWEEN 0 AND 20 THEN '0-20'
        WHEN p_score BETWEEN 21 AND 40 THEN '21-40'
        WHEN p_score BETWEEN 41 AND 60 THEN '41-60'
        WHEN p_score BETWEEN 61 AND 80 THEN '61-80'
        ELSE '81-100'
    END;

    SELECT success_rate INTO v_prob
    FROM public.score_calibration
    WHERE score_bucket = v_bucket;

    IF v_prob IS NULL THEN
        RETURN ROUND((p_score::FLOAT / 100.0)::NUMERIC, 2);
    END IF;

    RETURN v_prob;
END;
$$ LANGUAGE plpgsql STABLE;

-- Run it once to seed if data exists
SELECT public.recalibrate_scores();

-- 4. Scheduled job (pg_cron) daily
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    -- Unschedule if it exists to prevent errors
    PERFORM cron.unschedule('daily-recalibrate-scores');
EXCEPTION WHEN OTHERS THEN
    -- Ignore error if not exists or pg_cron restricted
END $$;

DO $$
BEGIN
    PERFORM cron.schedule('daily-recalibrate-scores', '0 0 * * *', 'SELECT public.recalibrate_scores();');
EXCEPTION WHEN OTHERS THEN
    -- Fallback/ignore if user permissions on cron are restricted
END $$;
