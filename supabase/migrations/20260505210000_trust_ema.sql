-- =============================================================================
-- Feature: EMA Trust Feedback Loop
-- =============================================================================

-- 1. Create trust_history table
CREATE TABLE IF NOT EXISTS public.api_key_trust_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
    place_id UUID NOT NULL,
    signal_type TEXT NOT NULL,
    actual_outcome TEXT NOT NULL,
    accuracy_score FLOAT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_key_trust_history_api_key ON public.api_key_trust_history(api_key_id, created_at DESC);

-- 2. Add columns to api_key_trust for daily caps
ALTER TABLE public.api_key_trust
ADD COLUMN IF NOT EXISTS daily_start_trust FLOAT DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE;

-- 3. Replace update_trust_from_outcome logic
CREATE OR REPLACE FUNCTION public.update_trust_from_outcome()
RETURNS TRIGGER AS $$
DECLARE
    r_signal RECORD;
    v_is_match BOOLEAN;
    v_accuracy_score FLOAT;
    v_current_trust FLOAT;
    v_daily_start_trust FLOAT;
    v_last_reset_date DATE;
    v_total_samples INT;
    v_volatility FLOAT;
    v_alpha FLOAT;
    v_raw_new_trust FLOAT;
    v_new_trust FLOAT;
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
        v_accuracy_score := 0.0;

        -- Check Alignment
        IF NEW.actual_outcome = 'SUCCESS' THEN
            IF r_signal.confidence_impact > 0 THEN v_is_match := TRUE; END IF;
        ELSIF NEW.actual_outcome = 'FAILED' THEN
            IF r_signal.confidence_impact < 0 THEN v_is_match := TRUE; END IF;
        ELSIF NEW.actual_outcome = 'CLOSED' THEN
            IF r_signal.signal_type = 'CLOSED_DETECTED' THEN v_is_match := TRUE; END IF;
        END IF;

        IF v_is_match THEN
            v_accuracy_score := 1.0;
        ELSE
            -- Contradiction
            v_accuracy_score := 0.0;
            
            -- High Penalty for critical mismatches
            IF (r_signal.signal_type = 'CLOSED_DETECTED' AND NEW.actual_outcome = 'SUCCESS') OR
               (r_signal.signal_type = 'PICKUP_LOCATION_VERIFIED' AND NEW.actual_outcome = 'FAILED') THEN
                v_accuracy_score := -0.5;
            END IF;
        END IF;

        -- 1. Store in history
        INSERT INTO public.api_key_trust_history (
            api_key_id, place_id, signal_type, actual_outcome, accuracy_score
        ) VALUES (
            r_signal.api_key_id, NEW.place_id, r_signal.signal_type, NEW.actual_outcome, v_accuracy_score
        );

        -- 2. Fetch current state
        SELECT trust_score, daily_start_trust, last_reset_date
        INTO v_current_trust, v_daily_start_trust, v_last_reset_date
        FROM public.api_key_trust
        WHERE api_key_id = r_signal.api_key_id
        FOR UPDATE;

        -- Handle Daily Reset
        IF v_last_reset_date < CURRENT_DATE THEN
            v_daily_start_trust := v_current_trust;
            v_last_reset_date := CURRENT_DATE;
        END IF;

        -- 3. Minimum Sample Check
        SELECT COUNT(*) INTO v_total_samples
        FROM public.api_key_trust_history
        WHERE api_key_id = r_signal.api_key_id;

        IF v_total_samples >= 5 THEN
            -- 4. Calculate Volatility (std dev of last 50)
            SELECT COALESCE(stddev_samp(accuracy_score), 0.0) INTO v_volatility
            FROM (
                SELECT accuracy_score 
                FROM public.api_key_trust_history 
                WHERE api_key_id = r_signal.api_key_id 
                ORDER BY created_at DESC 
                LIMIT 50
            ) recent;

            -- 5. Calculate dynamic alpha
            -- Base alpha is 0.1. Reduce impact if volatility is high.
            -- Max volatility is ~0.7, so we dampen alpha smoothly.
            v_alpha := 0.1 * (1.0 - LEAST(v_volatility, 0.9));

            -- 6. Calculate EMA
            v_raw_new_trust := (v_alpha * v_accuracy_score) + ((1.0 - v_alpha) * v_current_trust);

            -- 7. Cap daily movement (-0.05 to +0.05 per day)
            v_new_trust := LEAST(v_daily_start_trust + 0.05, GREATEST(v_daily_start_trust - 0.05, v_raw_new_trust));
            
            -- Absolute bounds
            v_new_trust := GREATEST(0.1, LEAST(1.0, v_new_trust));
        ELSE
            -- Not enough samples, keep trust unchanged
            v_new_trust := v_current_trust;
        END IF;

        -- Apply Update to Trust Score
        UPDATE public.api_key_trust
        SET 
            trust_score = v_new_trust,
            daily_start_trust = v_daily_start_trust,
            last_reset_date = v_last_reset_date,
            successful_signals = successful_signals + (CASE WHEN v_is_match THEN 1 ELSE 0 END),
            failed_signals = failed_signals + (CASE WHEN v_is_match THEN 0 ELSE 1 END),
            last_updated_at = NOW()
        WHERE api_key_id = r_signal.api_key_id;

        -- Update activity log with new EMA stats
        -- Safely insert ignoring schema variations in event_meta vs metadata
        BEGIN
            INSERT INTO public.activity_logs (
                place_id, event_type, event_meta
            ) VALUES (
                NEW.place_id,
                'TRUST_EMA_UPDATE',
                jsonb_build_object(
                    'api_key_id', r_signal.api_key_id,
                    'accuracy_score', v_accuracy_score,
                    'volatility', v_volatility,
                    'alpha', v_alpha,
                    'old_trust', v_current_trust,
                    'new_trust', v_new_trust
                )
            );
        EXCEPTION WHEN undefined_column THEN
            -- fallback if activity_logs uses legacy schema (user_id, action, metadata)
            INSERT INTO public.activity_logs (
                user_id, action, entity_type, entity_id, metadata
            ) SELECT 
                user_id, 'TRUST_EMA_UPDATE', 'api_key', r_signal.api_key_id,
                jsonb_build_object(
                    'accuracy_score', v_accuracy_score,
                    'volatility', v_volatility,
                    'alpha', v_alpha,
                    'new_trust', v_new_trust
                )
            FROM public.api_keys WHERE id = r_signal.api_key_id;
        END;

    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
