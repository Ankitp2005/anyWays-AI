-- =============================================================================
-- DASHBOARD ENHANCEMENTS
-- 1. confidence_history table for trend line
-- 2. activity_logs table for unified feed
-- 3. Update ingest_signal RPC to log to confidence_history
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.confidence_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    score INT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_confidence_history_place_id ON public.confidence_history(place_id, recorded_at DESC);

-- Allow authenticated users to read confidence history for places they own
ALTER TABLE public.confidence_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "confidence_history: owner can read"
  ON public.confidence_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.places WHERE id = confidence_history.place_id AND user_id = auth.uid()));


CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'METADATA_EDIT', 'STATUS_CHANGE', 'MANUAL_VERIFICATION'
    event_meta JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_place_id ON public.activity_logs(place_id, created_at DESC);

-- Allow authenticated users to read and insert activity logs for places they own
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_logs: owner can read"
  ON public.activity_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.places WHERE id = activity_logs.place_id AND user_id = auth.uid()));

CREATE POLICY "activity_logs: owner can insert"
  ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.places WHERE id = activity_logs.place_id AND user_id = auth.uid()));


-- =============================================================================
-- UPDATE RPC to insert into confidence_history
-- =============================================================================
CREATE OR REPLACE FUNCTION ingest_signal(
    p_place_id UUID,
    p_signal_type TEXT,
    p_signal_value JSONB,
    p_confidence_impact INT,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_new_score INT;
    v_updated_place JSONB;
BEGIN
    -- Step 1: Verify Ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.places 
        WHERE id = p_place_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Place not found or unauthorized';
    END IF;

    -- Step 2: Insert the signal
    INSERT INTO public.validation_signals (place_id, signal_type, signal_value, confidence_impact)
    VALUES (p_place_id, p_signal_type, p_signal_value, p_confidence_impact);

    -- Step 3: Calculate new confidence score
    WITH SignalScores AS (
        SELECT 
            confidence_impact,
            signal_type,
            EXTRACT(EPOCH FROM (now() - detected_at)) / 86400.0 AS days_elapsed,
            CASE signal_type
                WHEN 'OCR_MENU' THEN 1.00
                WHEN 'HOURS_VERIFIED' THEN 0.90
                WHEN 'FOOT_TRAFFIC' THEN 0.80
                WHEN 'PHONE_VERIFIED' THEN 0.70
                WHEN 'SOCIAL_SENTIMENT' THEN 0.30
                ELSE 0.50
            END as type_weight
        FROM public.validation_signals
        WHERE place_id = p_place_id
    ),
    BaseCalc AS (
        SELECT 
            SUM(confidence_impact * type_weight * EXP(-(0.023104906) * GREATEST(0, days_elapsed))) AS base_score,
            COUNT(DISTINCT signal_type) as distinct_types
        FROM SignalScores
    )
    SELECT 
        GREATEST(0, LEAST(100, ROUND(base_score + CASE WHEN distinct_types >= 3 THEN 5 ELSE 0 END)))
    INTO v_new_score
    FROM BaseCalc;

    v_new_score := COALESCE(v_new_score, 0);

    -- Step 4: Update the place
    UPDATE public.places
    SET 
        confidence_score = v_new_score,
        last_validated_at = NOW()
    WHERE id = p_place_id
    RETURNING row_to_json(places.*) INTO v_updated_place;

    -- Step 5: Log history snapshot
    INSERT INTO public.confidence_history (place_id, score)
    VALUES (p_place_id, v_new_score);

    -- Return the updated row
    RETURN v_updated_place;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
