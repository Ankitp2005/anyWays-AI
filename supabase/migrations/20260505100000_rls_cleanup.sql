-- =============================================================================
-- RLS SECURITY & POLICY CLEANUP
-- =============================================================================

-- 1. activity_logs: Ensure owner can read/insert
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_logs: owner can read" ON public.activity_logs;
CREATE POLICY "activity_logs: owner can read"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.places WHERE id = activity_logs.place_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "activity_logs: owner can insert" ON public.activity_logs;
CREATE POLICY "activity_logs: owner can insert"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.places WHERE id = activity_logs.place_id AND user_id = auth.uid()));

-- 2. confidence_history: Ensure owner can read
ALTER TABLE public.confidence_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "confidence_history: owner can read" ON public.confidence_history;
CREATE POLICY "confidence_history: owner can read"
  ON public.confidence_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.places WHERE id = confidence_history.place_id AND user_id = auth.uid()));

-- 3. signal_events: Tighten security (remove public access)
ALTER TABLE public.signal_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all" ON public.signal_events;
CREATE POLICY "signal_events: authenticated read" 
  ON public.signal_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for service role" ON public.signal_events;
CREATE POLICY "signal_events: service_role insert" 
  ON public.signal_events FOR INSERT TO service_role WITH CHECK (true);

-- 4. Clean up truncated policy names for clarity
-- daily_system_metrics
DROP POLICY IF EXISTS "Enable read access for authenticated users on daily_system_metrics" ON public.daily_system_metrics;
CREATE POLICY "daily_metrics: auth read" 
  ON public.daily_system_metrics FOR SELECT TO authenticated USING (true);

-- signal_weights_history
DROP POLICY IF EXISTS "Enable read access for authenticated users on signal_weights_history" ON public.signal_weights_history;
CREATE POLICY "weights_history: auth read" 
  ON public.signal_weights_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable service role full access on signal_weights_history" ON public.signal_weights_history;
CREATE POLICY "weights_history: service full" 
  ON public.signal_weights_history FOR ALL TO service_role USING (true);

-- api_key_trust
DROP POLICY IF EXISTS "Enable service role full access" ON public.api_key_trust;
CREATE POLICY "api_trust: service full" 
  ON public.api_key_trust FOR ALL TO service_role USING (true);

-- score_calibration
DROP POLICY IF EXISTS "Enable read access for authenticated users on score_calibration" ON public.score_calibration;
CREATE POLICY "score_cal: auth read" 
  ON public.score_calibration FOR SELECT TO authenticated USING (true);
