-- =============================================================================
-- System Effectiveness Analytics 
-- =============================================================================

-- 1. Create table to store daily aggregates
CREATE TABLE IF NOT EXISTS public.daily_system_metrics (
    date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    avg_confidence_score FLOAT,
    signal_frequency INT,
    decay_events INT,
    places_above_80_pct FLOAT,
    places_decayed_below_50_pct FLOAT,
    recovery_rate_pct FLOAT,
    computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.daily_system_metrics ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
DROP POLICY IF EXISTS "Enable read access for authenticated users on daily_system_metrics" ON public.daily_system_metrics;
CREATE POLICY "Enable read access for authenticated users on daily_system_metrics" 
ON public.daily_system_metrics FOR SELECT 
TO authenticated 
USING (true);

-- 2. RPC to compute and upsert daily metrics
CREATE OR REPLACE FUNCTION compute_daily_metrics()
RETURNS JSONB AS $$
DECLARE
    v_date DATE := CURRENT_DATE;
    v_avg_confidence FLOAT;
    v_signal_frequency INT;
    v_decay_events INT;
    v_places_above_80 FLOAT;
    v_places_decayed_below_50 FLOAT;
    v_recovery_rate FLOAT;
    v_total_places INT;
    v_result JSONB;
BEGIN
    SELECT COUNT(*) INTO v_total_places FROM public.places;
    
    IF v_total_places = 0 THEN 
        RETURN '{"status": "no_data"}'::jsonb;
    END IF;

    -- Core metrics
    SELECT AVG(confidence_score) INTO v_avg_confidence FROM public.places;
    
    SELECT COUNT(*) INTO v_signal_frequency 
    FROM public.validation_signals 
    WHERE DATE(created_at) = v_date;

    SELECT COUNT(*) INTO v_decay_events 
    FROM public.validation_signals 
    WHERE signal_type::text = 'DECAY' AND DATE(created_at) = v_date;
    
    -- Business metrics
    SELECT (COUNT(*) FILTER (WHERE confidence_score >= 80)::FLOAT / v_total_places) * 100
    INTO v_places_above_80 FROM public.places;

    -- % of total places that decayed below 50 today
    SELECT (COUNT(DISTINCT place_id)::FLOAT / v_total_places) * 100
    INTO v_places_decayed_below_50 
    FROM public.signal_events 
    WHERE signal_type = 'DECAY' AND score_after < 50 AND DATE(created_at) = v_date;

    -- Recovery rate: percentage of places that improved past 50 today after previously dropping <= 50
    SELECT 
        COALESCE(
            (COUNT(DISTINCT CASE WHEN score_after > 50 THEN place_id END)::FLOAT / 
            NULLIF(COUNT(DISTINCT place_id), 0)) * 100, 
            0
        )
    INTO v_recovery_rate
    FROM public.signal_events
    WHERE score_before <= 50 AND DATE(created_at) = v_date;

    -- Upsert metrics
    INSERT INTO public.daily_system_metrics (
        date, avg_confidence_score, signal_frequency, decay_events,
        places_above_80_pct, places_decayed_below_50_pct, recovery_rate_pct
    ) VALUES (
        v_date, v_avg_confidence, v_signal_frequency, v_decay_events,
        v_places_above_80, v_places_decayed_below_50, v_recovery_rate
    )
    ON CONFLICT (date) DO UPDATE SET
        avg_confidence_score = EXCLUDED.avg_confidence_score,
        signal_frequency = EXCLUDED.signal_frequency,
        decay_events = EXCLUDED.decay_events,
        places_above_80_pct = EXCLUDED.places_above_80_pct,
        places_decayed_below_50_pct = EXCLUDED.places_decayed_below_50_pct,
        recovery_rate_pct = EXCLUDED.recovery_rate_pct,
        computed_at = NOW()
    RETURNING to_jsonb(daily_system_metrics.*) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
