-- =============================================================================
-- Feature: Trust Scoring Layer (Upgraded)
-- =============================================================================

-- 0. Clean up legacy implementation if it exists
DROP TABLE IF EXISTS public.api_key_trust CASCADE;
DROP FUNCTION IF EXISTS public.increment_api_trust(TEXT, BOOLEAN);

-- 1. Create api_key_trust table
CREATE TABLE IF NOT EXISTS public.api_key_trust (
    api_key_id UUID PRIMARY KEY REFERENCES public.api_keys(id) ON DELETE CASCADE,
    trust_score FLOAT NOT NULL DEFAULT 0.5,
    successful_signals INT NOT NULL DEFAULT 0,
    failed_signals INT NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.api_key_trust ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for authenticated users on api_key_trust" ON public.api_key_trust;
CREATE POLICY "Enable read for authenticated users on api_key_trust" 
ON public.api_key_trust FOR SELECT TO authenticated USING (true);

-- 2. Add api_key_id to validation_signals
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'validation_signals' AND column_name = 'api_key_id') THEN
        ALTER TABLE public.validation_signals ADD COLUMN api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Initialize trust score for existing API keys
INSERT INTO public.api_key_trust (api_key_id)
SELECT id FROM public.api_keys
ON CONFLICT DO NOTHING;

-- 4. Create trigger to initialize trust for new API keys
CREATE OR REPLACE FUNCTION public.initialize_api_key_trust()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.api_key_trust (api_key_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_initialize_api_key_trust ON public.api_keys;
CREATE TRIGGER tr_initialize_api_key_trust
AFTER INSERT ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION public.initialize_api_key_trust();

-- 5. Update scoring pipeline: Modified ingest_signal
CREATE OR REPLACE FUNCTION public.ingest_signal_v4(
    p_place_id UUID,
    p_signal_type TEXT,
    p_signal_value JSONB,
    p_confidence_impact INT,
    p_user_id UUID,
    p_api_key_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_current_score FLOAT;
    v_new_score INT;
    v_adjusted_impact FLOAT;
    v_trust_score FLOAT := 1.0;
    v_is_duplicate BOOLEAN;
    v_updated_place JSONB;
BEGIN
    -- 1. Fetch current score and lock
    SELECT confidence_score INTO v_current_score
    FROM public.places 
    WHERE id = p_place_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Place not found or unauthorized';
    END IF;

    -- 2. Apply Trust Score
    IF p_api_key_id IS NOT NULL THEN
        SELECT trust_score INTO v_trust_score
        FROM public.api_key_trust
        WHERE api_key_id = p_api_key_id;
        
        -- Fallback to default if not found
        IF v_trust_score IS NULL THEN v_trust_score := 0.5; END IF;
    END IF;

    v_adjusted_impact := p_confidence_impact::FLOAT * v_trust_score;

    -- 3. System Guardrails
    v_adjusted_impact := LEAST(v_adjusted_impact, 45.0);
    v_adjusted_impact := GREATEST(v_adjusted_impact, -60.0);

    -- 4. Anti-Spam Protection
    SELECT EXISTS (
        SELECT 1 FROM public.validation_signals
        WHERE place_id = p_place_id 
          AND signal_type = p_signal_type::public.signal_type
          AND created_at > (NOW() - INTERVAL '2 minutes')
    ) INTO v_is_duplicate;

    IF v_is_duplicate THEN
        v_adjusted_impact := v_adjusted_impact * 0.5;
    END IF;

    -- 5. Calculate New Score
    v_new_score := ROUND(
        GREATEST(0, LEAST(100, 
            v_current_score + (v_adjusted_impact * (1.0 - v_current_score / 100.0))
        ))
    );

    -- 6. Persistence
    INSERT INTO public.validation_signals (
        place_id, 
        signal_type, 
        signal_value, 
        confidence_impact, 
        user_id,
        api_key_id
    )
    VALUES (
        p_place_id, 
        p_signal_type::public.signal_type, 
        p_signal_value, 
        v_adjusted_impact::INT,
        p_user_id,
        p_api_key_id
    );

    UPDATE public.places
    SET 
        confidence_score = v_new_score,
        last_validated_at = NOW()
    WHERE id = p_place_id
    RETURNING row_to_json(places.*) INTO v_updated_place;

    RETURN v_updated_place;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Dynamic Trust Update Logic
CREATE OR REPLACE FUNCTION public.update_trust_from_outcome()
RETURNS TRIGGER AS $$
DECLARE
    r_signal RECORD;
    v_delta FLOAT;
    v_is_match BOOLEAN;
BEGIN
    -- For each signal provided in the last 48 hours for this place
    FOR r_signal IN 
        SELECT id, api_key_id, signal_type, confidence_impact 
        FROM public.validation_signals
        WHERE place_id = NEW.place_id
          AND api_key_id IS NOT NULL
          AND created_at > (NOW() - INTERVAL '48 hours')
    LOOP
        v_is_match := FALSE;
        v_delta := 0;

        -- Check Alignment
        IF NEW.actual_outcome = 'SUCCESS' THEN
            IF r_signal.confidence_impact > 0 THEN v_is_match := TRUE; END IF;
        ELSIF NEW.actual_outcome = 'FAILED' THEN
            IF r_signal.confidence_impact < 0 THEN v_is_match := TRUE; END IF;
        ELSIF NEW.actual_outcome = 'CLOSED' THEN
            IF r_signal.signal_type = 'CLOSED_DETECTED' THEN v_is_match := TRUE; END IF;
        END IF;

        IF v_is_match THEN
            v_delta := 0.02;
        ELSE
            -- Contradiction
            v_delta := -0.05;
            
            -- High Penalty for critical mismatches
            IF (r_signal.signal_type = 'CLOSED_DETECTED' AND NEW.actual_outcome = 'SUCCESS') OR
               (r_signal.signal_type = 'PICKUP_LOCATION_VERIFIED' AND NEW.actual_outcome = 'FAILED') THEN
                v_delta := -0.15;
            END IF;
        END IF;

        -- Apply Update to Trust Score
        UPDATE public.api_key_trust
        SET 
            trust_score = GREATEST(0.1, LEAST(1.0, trust_score + v_delta)),
            successful_signals = successful_signals + (CASE WHEN v_is_match THEN 1 ELSE 0 END),
            failed_signals = failed_signals + (CASE WHEN v_is_match THEN 0 ELSE 1 END),
            last_updated_at = NOW()
        WHERE api_key_id = r_signal.api_key_id;

        -- Log Activity
        INSERT INTO public.activity_logs (
            user_id, 
            action, 
            entity_type, 
            entity_id, 
            metadata
        )
        SELECT 
            ak.user_id,
            'TRUST_UPDATE',
            'api_key',
            r_signal.api_key_id,
            jsonb_build_object(
                'delta', v_delta,
                'signal_type', r_signal.signal_type,
                'outcome', NEW.actual_outcome,
                'place_id', NEW.place_id
            )
        FROM public.api_keys ak
        WHERE ak.id = r_signal.api_key_id;

    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_trust_on_delivery ON public.delivery_attempts;
CREATE TRIGGER tr_update_trust_on_delivery
AFTER INSERT ON public.delivery_attempts
FOR EACH ROW EXECUTE FUNCTION public.update_trust_from_outcome();
