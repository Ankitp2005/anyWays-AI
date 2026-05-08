-- Create signal_events table
CREATE TABLE IF NOT EXISTS public.signal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL,
    confidence_delta INT NOT NULL,
    score_before INT NOT NULL,
    score_after INT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_signal_events_place_id ON public.signal_events(place_id);
CREATE INDEX IF NOT EXISTS idx_signal_events_created_at_desc ON public.signal_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.signal_events ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated or service role
DROP POLICY IF EXISTS "Enable read access for all" ON public.signal_events;
CREATE POLICY "Enable read access for all" ON public.signal_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for service role" ON public.signal_events;
CREATE POLICY "Enable insert for service role" ON public.signal_events FOR INSERT WITH CHECK (true);

-- Update ingest_signal RPC to atomically insert into signal_events
CREATE OR REPLACE FUNCTION public.ingest_signal(
    p_place_id UUID,
    p_signal_type TEXT,
    p_signal_value JSONB,
    p_confidence_impact INT,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_current_score FLOAT;
    v_new_score INT;
    v_adjusted_impact FLOAT;
    v_is_duplicate BOOLEAN;
    v_updated_place JSONB;
BEGIN
    -- 1. Security & Ownership Check
    -- Lock the place row for update to ensure atomicity
    SELECT confidence_score INTO v_current_score
    FROM public.places 
    WHERE id = p_place_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Place not found or unauthorized';
    END IF;

    v_adjusted_impact := p_confidence_impact::FLOAT;

    -- 2. System Guardrail: Cap maximum impact
    v_adjusted_impact := LEAST(v_adjusted_impact, 45.0);

    -- 3. Negative Signal Damping (50% reduction)
    IF v_adjusted_impact < 0 THEN
        v_adjusted_impact := v_adjusted_impact * 0.5;
    END IF;

    -- 4. Anti-Spam Protection: 2-minute window check
    SELECT EXISTS (
        SELECT 1 FROM public.validation_signals
        WHERE place_id = p_place_id 
          AND signal_type = p_signal_type::public.signal_type
          AND created_at > (NOW() - INTERVAL '2 minutes')
    ) INTO v_is_duplicate;

    IF v_is_duplicate THEN
        v_adjusted_impact := v_adjusted_impact * 0.7;
    END IF;

    -- 5. Calculate New Score (Diminishing Returns Formula)
    v_new_score := ROUND(
        GREATEST(0, LEAST(100, 
            v_current_score + (v_adjusted_impact * (1.0 - v_current_score / 100.0))
        ))
    );

    -- 6. Atomic Persistence
    -- A. Insert the validation_signal record
    INSERT INTO public.validation_signals (
        place_id, 
        signal_type, 
        signal_value, 
        confidence_impact, 
        user_id
    )
    VALUES (
        p_place_id, 
        p_signal_type::public.signal_type, 
        p_signal_value, 
        v_adjusted_impact::INT, -- Store the adjusted impact for history
        p_user_id
    );

    -- B. Insert into signal_events
    INSERT INTO public.signal_events (
        place_id,
        signal_type,
        confidence_delta,
        score_before,
        score_after,
        metadata
    ) VALUES (
        p_place_id,
        p_signal_type,
        v_new_score - v_current_score::INT,
        v_current_score::INT,
        v_new_score,
        p_signal_value
    );

    -- C. Update the place
    UPDATE public.places
    SET 
        confidence_score = v_new_score,
        last_validated_at = NOW()
    WHERE id = p_place_id
    RETURNING row_to_json(places.*) INTO v_updated_place;

    -- D. Log history snapshot (Legacy/Backward Compatibility)
    BEGIN
      INSERT INTO public.confidence_history (place_id, score)
      VALUES (p_place_id, v_new_score);
    EXCEPTION WHEN undefined_table THEN
      -- table might not exist in all environments, ignore
    END;

    -- 7. Return the updated row
    RETURN v_updated_place;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create get_place_signal_history RPC
CREATE OR REPLACE FUNCTION public.get_place_signal_history(p_place_id UUID)
RETURNS SETOF public.signal_events AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.signal_events
    WHERE place_id = p_place_id
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
