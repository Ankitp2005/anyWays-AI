-- =============================================================================
-- System Health & Model Monitoring
-- =============================================================================

-- 1. Create Model Performance Metrics Table
CREATE TABLE IF NOT EXISTS public.model_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL UNIQUE,
    total_predictions INT DEFAULT 0,
    total_success INT DEFAULT 0,
    total_failures INT DEFAULT 0,
    accuracy FLOAT DEFAULT 0.0,
    precision FLOAT DEFAULT 0.0,
    recall FLOAT DEFAULT 0.0,
    avg_predicted_score FLOAT DEFAULT 0.0,
    avg_actual_success_rate FLOAT DEFAULT 0.0,
    calibration_error FLOAT DEFAULT 0.0,
    drift_score FLOAT DEFAULT 0.0,
    status TEXT DEFAULT 'HEALTHY',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create System Alerts Table
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create the Daily Aggregation Function
CREATE OR REPLACE FUNCTION public.compute_daily_model_metrics()
RETURNS void AS $$
DECLARE
    v_date DATE := CURRENT_DATE - INTERVAL '1 day';
    
    v_total INT := 0;
    v_actual_success INT := 0;
    v_actual_fail INT := 0;
    
    v_tp INT := 0;
    v_fp INT := 0;
    v_tn INT := 0;
    v_fn INT := 0;
    
    v_accuracy FLOAT := 0;
    v_precision FLOAT := 0;
    v_recall FLOAT := 0;
    
    v_avg_pred FLOAT := 0;
    v_avg_actual FLOAT := 0;
    v_calib_err FLOAT := 0;
    
    v_hist_avg_score FLOAT := 0;
    v_hist_avg_acc FLOAT := 0;
    v_drift_score FLOAT := 0;
    
    v_status TEXT := 'HEALTHY';
    v_acc_drop FLOAT := 0;
BEGIN
    -- Aggregate last 24 hours
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE actual_outcome = 'SUCCESS'),
        COUNT(*) FILTER (WHERE actual_outcome != 'SUCCESS'),
        COUNT(*) FILTER (WHERE predicted_score >= 50 AND actual_outcome = 'SUCCESS'),
        COUNT(*) FILTER (WHERE predicted_score >= 50 AND actual_outcome != 'SUCCESS'),
        COUNT(*) FILTER (WHERE predicted_score < 50 AND actual_outcome != 'SUCCESS'),
        COUNT(*) FILTER (WHERE predicted_score < 50 AND actual_outcome = 'SUCCESS'),
        COALESCE(AVG(predicted_score) / 100.0, 0)
    INTO 
        v_total, v_actual_success, v_actual_fail,
        v_tp, v_fp, v_tn, v_fn,
        v_avg_pred
    FROM public.delivery_attempts
    WHERE created_at >= (CURRENT_DATE - INTERVAL '1 day')
      AND created_at < CURRENT_DATE;

    -- Data Issue Alert
    IF v_total < 10 THEN
        INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
        VALUES ('DATA_ISSUE', 'MEDIUM', 'Low prediction volume (<10 samples/day)', jsonb_build_object('total', v_total, 'date', v_date));
    END IF;

    -- Compute metrics safely
    IF v_total > 0 THEN
        v_accuracy := (v_tp + v_tn)::FLOAT / v_total;
        v_avg_actual := v_actual_success::FLOAT / v_total;
        v_calib_err := ABS(v_avg_pred - v_avg_actual);
        
        IF (v_tp + v_fp) > 0 THEN v_precision := v_tp::FLOAT / (v_tp + v_fp); END IF;
        IF (v_tp + v_fn) > 0 THEN v_recall := v_tp::FLOAT / (v_tp + v_fn); END IF;
    END IF;

    -- Compute Historical (Last 7 Days) for Drift
    SELECT 
        COALESCE(AVG(avg_predicted_score), v_avg_pred),
        COALESCE(AVG(accuracy), v_accuracy)
    INTO v_hist_avg_score, v_hist_avg_acc
    FROM public.model_performance_metrics
    WHERE metric_date >= v_date - INTERVAL '7 days' AND metric_date < v_date;

    -- Calculate Drift
    v_drift_score := ABS(v_avg_pred - v_hist_avg_score);
    v_acc_drop := v_hist_avg_acc - v_accuracy;

    -- Apply Rules
    IF v_drift_score > 0.25 OR v_acc_drop > 0.20 THEN
        v_status := 'DEGRADED';
        IF v_drift_score > 0.25 THEN
            INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
            VALUES ('DRIFT', 'CRITICAL', 'Critical prediction drift detected', jsonb_build_object('drift_score', v_drift_score));
        END IF;
        IF v_acc_drop > 0.20 THEN
            INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
            VALUES ('ACCURACY_DROP', 'CRITICAL', 'Severe accuracy drop detected', jsonb_build_object('drop', v_acc_drop));
        END IF;
    ELSIF v_drift_score > 0.15 THEN
        v_status := 'WARNING';
        INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
        VALUES ('DRIFT', 'HIGH', 'Prediction drift warning', jsonb_build_object('drift_score', v_drift_score));
    END IF;

    -- Upsert metrics
    INSERT INTO public.model_performance_metrics (
        metric_date, total_predictions, total_success, total_failures,
        accuracy, precision, recall, avg_predicted_score, avg_actual_success_rate,
        calibration_error, drift_score, status
    ) VALUES (
        v_date, v_total, v_actual_success, v_actual_fail,
        v_accuracy, v_precision, v_recall, v_avg_pred, v_avg_actual,
        v_calib_err, v_drift_score, v_status
    )
    ON CONFLICT (metric_date) DO UPDATE SET
        total_predictions = EXCLUDED.total_predictions,
        total_success = EXCLUDED.total_success,
        total_failures = EXCLUDED.total_failures,
        accuracy = EXCLUDED.accuracy,
        precision = EXCLUDED.precision,
        recall = EXCLUDED.recall,
        avg_predicted_score = EXCLUDED.avg_predicted_score,
        avg_actual_success_rate = EXCLUDED.avg_actual_success_rate,
        calibration_error = EXCLUDED.calibration_error,
        drift_score = EXCLUDED.drift_score,
        status = EXCLUDED.status;

END;
$$ LANGUAGE plpgsql;

-- 4. Enable pg_cron job for daily metrics
-- NOTE: Requires pg_cron extension to be enabled in Supabase
SELECT cron.schedule(
  'daily_model_metrics',
  '0 1 * * *', -- Run every day at 1:00 AM
  $$SELECT public.compute_daily_model_metrics()$$
);
