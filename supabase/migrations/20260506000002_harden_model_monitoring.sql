-- =============================================================================
-- Harden Model Monitoring System
-- =============================================================================

ALTER TABLE public.activity_logs ALTER COLUMN place_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.compute_daily_model_metrics()
RETURNS void AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
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
    v_hist_avg_actual FLOAT := 0;
    v_drift_score FLOAT := 0;
    
    v_status TEXT := 'HEALTHY';
    v_acc_drop FLOAT := 0;
    v_execution_time_ms FLOAT := 0;
    v_log_status TEXT := 'SUCCESS';
    
    v_existing_alert_count INT := 0;
BEGIN
    -- 1. Aggregate last 24 hours
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

    -- 2. LOW SAMPLE HANDLING
    IF v_total < 10 THEN
        -- Check deduplication
        SELECT COUNT(*) INTO v_existing_alert_count FROM public.system_alerts 
        WHERE alert_type = 'DATA_ISSUE' AND created_at >= NOW() - INTERVAL '24 hours';
        
        IF v_existing_alert_count = 0 THEN
            INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
            VALUES ('DATA_ISSUE', 'MEDIUM', 'Low prediction volume (<10 samples/day)', jsonb_build_object('total', v_total, 'date', v_date));
        END IF;

        -- DO NOT compute metrics
        v_log_status := 'SKIPPED_LOW_DATA';
    ELSE
        -- 3. Compute metrics safely
        v_accuracy := (v_tp + v_tn)::FLOAT / v_total;
        v_avg_actual := v_actual_success::FLOAT / v_total;
        v_calib_err := ABS(v_avg_pred - v_avg_actual);
        
        IF (v_tp + v_fp) > 0 THEN v_precision := v_tp::FLOAT / (v_tp + v_fp); END IF;
        IF (v_tp + v_fn) > 0 THEN v_recall := v_tp::FLOAT / (v_tp + v_fn); END IF;

        -- 4. Compute Historical (Last 7 Days) for Drift
        SELECT 
            COALESCE(AVG(avg_predicted_score), v_avg_pred),
            COALESCE(AVG(accuracy), v_accuracy),
            COALESCE(AVG(avg_actual_success_rate), v_avg_actual)
        INTO v_hist_avg_score, v_hist_avg_acc, v_hist_avg_actual
        FROM public.model_performance_metrics
        WHERE metric_date >= v_date - INTERVAL '7 days' AND metric_date < v_date;

        -- 5. IMPROVED DRIFT CALCULATION
        v_drift_score := 0.5 * ABS(v_avg_pred - v_hist_avg_score) + 0.5 * ABS(v_avg_actual - v_hist_avg_actual);
        v_acc_drop := v_hist_avg_acc - v_accuracy;

        -- 6. Apply Rules
        IF v_total < 30 THEN
            v_status := 'LOW_CONFIDENCE';
        ELSIF v_drift_score > 0.25 OR v_acc_drop > 0.20 THEN
            v_status := 'DEGRADED';
            
            IF v_drift_score > 0.25 THEN
                SELECT COUNT(*) INTO v_existing_alert_count FROM public.system_alerts WHERE alert_type = 'DRIFT' AND created_at >= NOW() - INTERVAL '24 hours';
                IF v_existing_alert_count = 0 THEN
                    INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
                    VALUES ('DRIFT', 'CRITICAL', 'Critical prediction drift detected', jsonb_build_object('drift_score', v_drift_score));
                END IF;
            END IF;
            
            IF v_acc_drop > 0.20 THEN
                SELECT COUNT(*) INTO v_existing_alert_count FROM public.system_alerts WHERE alert_type = 'ACCURACY_DROP' AND created_at >= NOW() - INTERVAL '24 hours';
                IF v_existing_alert_count = 0 THEN
                    INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
                    VALUES ('ACCURACY_DROP', 'CRITICAL', 'Severe accuracy drop detected', jsonb_build_object('drop', v_acc_drop));
                END IF;
            END IF;
        ELSIF v_drift_score > 0.15 THEN
            v_status := 'WARNING';
            SELECT COUNT(*) INTO v_existing_alert_count FROM public.system_alerts WHERE alert_type = 'DRIFT' AND created_at >= NOW() - INTERVAL '24 hours';
            IF v_existing_alert_count = 0 THEN
                INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
                VALUES ('DRIFT', 'HIGH', 'Prediction drift warning', jsonb_build_object('drift_score', v_drift_score));
            END IF;
        END IF;

        -- 7. Upsert metrics
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
    END IF;

    -- 8. CRON EXECUTION LOGGING
    v_execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;
    
    INSERT INTO public.activity_logs (
        event_type, event_meta
    ) VALUES (
        'MODEL_MONITOR_RUN', jsonb_build_object(
            'total_predictions', v_total,
            'accuracy', v_accuracy,
            'drift_score', v_drift_score,
            'execution_time_ms', v_execution_time_ms,
            'status', v_log_status
        )
    );

EXCEPTION WHEN OTHERS THEN
    v_execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;
    INSERT INTO public.activity_logs (event_type, event_meta)
    VALUES ('MODEL_MONITOR_RUN', jsonb_build_object('error', SQLERRM, 'execution_time_ms', v_execution_time_ms, 'status', 'FAILURE'));
END;
$$ LANGUAGE plpgsql;
