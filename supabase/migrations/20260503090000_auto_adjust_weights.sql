-- =============================================================================
-- System: Auto-Adjust Signal Weights via Real Outcomes
-- =============================================================================

-- 1. Create History Table
CREATE TABLE IF NOT EXISTS public.signal_weights_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_type public.signal_type NOT NULL,
    old_base_weight FLOAT,
    new_base_weight FLOAT,
    old_reliability FLOAT,
    new_reliability FLOAT,
    correlation_metric FLOAT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.signal_weights_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users on signal_weights_history" ON public.signal_weights_history;
CREATE POLICY "Enable read access for authenticated users on signal_weights_history" 
ON public.signal_weights_history FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable service role full access on signal_weights_history" ON public.signal_weights_history;
CREATE POLICY "Enable service role full access on signal_weights_history" 
ON public.signal_weights_history FOR ALL TO service_role USING (true);

-- 2. Create RPC for Auto-Adjustment
CREATE OR REPLACE FUNCTION auto_adjust_signal_weights()
RETURNS VOID AS $$
DECLARE
    rec RECORD;
    v_total_attempts INT;
    v_overall_success_rate FLOAT;
    v_signal_success_rate FLOAT;
    v_signal_failure_rate FLOAT;
    v_signal_attempts INT;
    v_new_reliability FLOAT;
    v_new_weight FLOAT;
    v_metric FLOAT;
BEGIN
    -- Ensure enough statistical significance globally
    SELECT COUNT(*) INTO v_total_attempts FROM public.delivery_attempts;
    IF v_total_attempts < 50 THEN RETURN; END IF;

    -- Calculate global baseline success rate
    SELECT (COUNT(*) FILTER(WHERE actual_outcome = 'SUCCESS')::FLOAT / v_total_attempts) 
    INTO v_overall_success_rate FROM public.delivery_attempts;

    FOR rec IN SELECT * FROM public.signal_weights
    LOOP
        -- Find delivery attempts for places that had this specific signal
        SELECT 
            COUNT(DISTINCT da.id),
            COUNT(DISTINCT CASE WHEN da.actual_outcome = 'SUCCESS' THEN da.id END),
            COUNT(DISTINCT CASE WHEN da.actual_outcome IN ('FAILED', 'CLOSED') THEN da.id END)
        INTO v_signal_attempts, v_signal_success_rate, v_signal_failure_rate
        FROM public.delivery_attempts da
        JOIN public.validation_signals vs ON da.place_id = vs.place_id
        WHERE vs.signal_type = rec.signal_type;

        -- Ensure enough statistical significance locally per signal
        IF v_signal_attempts > 10 THEN
            v_signal_success_rate := v_signal_success_rate / v_signal_attempts;
            v_signal_failure_rate := v_signal_failure_rate / v_signal_attempts;
            
            -- If positive signal, we expect it to correlate with SUCCESS
            IF rec.base_weight > 0 THEN
                v_metric := v_signal_success_rate - v_overall_success_rate;
            ELSE
                -- If negative signal, we expect it to correlate with FAILURE
                v_metric := v_signal_failure_rate - (1.0 - v_overall_success_rate);
            END IF;

            v_new_reliability := rec.reliability_score;
            v_new_weight := rec.base_weight;

            -- Gradual adjustments max ±10% to prevent blind overwrites
            IF v_metric > 0.05 THEN
                -- Highly correlated: Increase weight and reliability
                v_new_reliability := LEAST(1.0, rec.reliability_score * 1.10);
                v_new_weight := rec.base_weight * 1.10;
            ELSIF v_metric < -0.05 THEN
                -- Poorly correlated: Decrease weight and reliability
                v_new_reliability := GREATEST(0.1, rec.reliability_score * 0.90);
                v_new_weight := rec.base_weight * 0.90;
            END IF;

            -- If values drifted, persist to history and update active weights
            IF v_new_reliability != rec.reliability_score OR v_new_weight != rec.base_weight THEN
                INSERT INTO public.signal_weights_history (
                    signal_type, old_base_weight, new_base_weight, 
                    old_reliability, new_reliability, correlation_metric
                ) VALUES (
                    rec.signal_type, rec.base_weight, v_new_weight,
                    rec.reliability_score, v_new_reliability, v_metric
                );

                UPDATE public.signal_weights 
                SET base_weight = v_new_weight,
                    reliability_score = v_new_reliability
                WHERE signal_type = rec.signal_type;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Schedule the Cron Job (Requires pg_cron)
-- Execute once a week on Sunday at midnight
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('auto_adjust_weights_weekly', '0 0 * * 0', 'SELECT public.auto_adjust_signal_weights();');
    END IF;
END
$$;
