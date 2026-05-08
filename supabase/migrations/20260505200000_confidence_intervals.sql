-- =============================================================================
-- Score Calibration Upgrade with Confidence Intervals
-- =============================================================================

-- 1. Extend score_calibration table
ALTER TABLE public.score_calibration
ADD COLUMN IF NOT EXISTS std_dev FLOAT,
ADD COLUMN IF NOT EXISTS confidence_lower FLOAT,
ADD COLUMN IF NOT EXISTS confidence_upper FLOAT;

-- 2. Update aggregation function
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
    ),
    stats AS (
        SELECT 
            score_bucket,
            total_samples,
            (success_samples::FLOAT / total_samples) as p
        FROM buckets
        WHERE total_samples > 0
    )
    INSERT INTO public.score_calibration (
        score_bucket, 
        success_rate, 
        total_samples,
        std_dev,
        confidence_lower,
        confidence_upper
    )
    SELECT 
        score_bucket, 
        ROUND(p::NUMERIC, 4), 
        total_samples,
        -- Calculate Standard Deviation: sqrt(p * (1 - p) / n)
        ROUND(SQRT(p * (1 - p) / total_samples)::NUMERIC, 4),
        -- Lower bound: p - 1.96 * std_dev
        ROUND(GREATEST(0, p - 1.96 * SQRT(p * (1 - p) / total_samples))::NUMERIC, 4),
        -- Upper bound: p + 1.96 * std_dev
        ROUND(LEAST(1, p + 1.96 * SQRT(p * (1 - p) / total_samples))::NUMERIC, 4)
    FROM stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run it once to seed
SELECT public.recalibrate_scores();

-- 3. Create a new function to get detailed calibration info
CREATE OR REPLACE FUNCTION public.get_score_calibration_details(p_score INT)
RETURNS JSONB AS $$
DECLARE
    v_bucket TEXT;
    v_row RECORD;
    v_reliability TEXT;
BEGIN
    v_bucket := CASE 
        WHEN p_score BETWEEN 0 AND 20 THEN '0-20'
        WHEN p_score BETWEEN 21 AND 40 THEN '21-40'
        WHEN p_score BETWEEN 41 AND 60 THEN '41-60'
        WHEN p_score BETWEEN 61 AND 80 THEN '61-80'
        ELSE '81-100'
    END;

    SELECT * INTO v_row
    FROM public.score_calibration
    WHERE score_bucket = v_bucket;

    IF v_row IS NULL THEN
        -- Fallback if no data
        RETURN jsonb_build_object(
            'success_probability', ROUND((p_score::FLOAT / 100.0)::NUMERIC, 2),
            'confidence_interval', jsonb_build_array(
                GREATEST(0, ROUND((p_score::FLOAT / 100.0 - 0.2)::NUMERIC, 2)),
                LEAST(1, ROUND((p_score::FLOAT / 100.0 + 0.2)::NUMERIC, 2))
            ),
            'sample_size', 0,
            'reliability', 'LOW'
        );
    END IF;

    -- Determine reliability
    IF v_row.total_samples < 30 THEN
        v_reliability := 'LOW';
    ELSIF v_row.total_samples < 100 THEN
        v_reliability := 'MEDIUM';
    ELSE
        v_reliability := 'HIGH';
    END IF;

    RETURN jsonb_build_object(
        'success_probability', v_row.success_rate,
        'confidence_interval', jsonb_build_array(v_row.confidence_lower, v_row.confidence_upper),
        'sample_size', v_row.total_samples,
        'reliability', v_reliability
    );
END;
$$ LANGUAGE plpgsql STABLE;
