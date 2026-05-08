-- =============================================================================
-- Signal Consistency Validation Layer
-- =============================================================================

-- 1. Add consistency_score to places table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'places' AND column_name = 'consistency_score') THEN
        ALTER TABLE public.places ADD COLUMN consistency_score FLOAT DEFAULT 1.0 CHECK (consistency_score >= 0 AND consistency_score <= 1.0);
    END IF;
END $$;

-- 2. Consistency validation function
CREATE OR REPLACE FUNCTION public.check_signal_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_conflict_found BOOLEAN := FALSE;
    v_penalty FLOAT := 0.0;
    v_conflict_reason TEXT;
    v_confidence_penalty INT := 0;
BEGIN
    -- Check for conflicts within the last 24 hours
    
    -- Rule 1: HIGH FOOT_TRAFFIC + CLOSED_DETECTED -> conflict
    IF NEW.signal_type = 'CLOSED_DETECTED' THEN
        IF EXISTS (
            SELECT 1 FROM public.validation_signals 
            WHERE place_id = NEW.place_id 
              AND signal_type = 'FOOT_TRAFFIC' 
              AND confidence_impact >= 5
              AND created_at > NOW() - INTERVAL '24 hours'
        ) THEN
            v_conflict_found := TRUE;
            v_penalty := 0.3;
            v_confidence_penalty := 20;
            v_conflict_reason := 'Conflict: CLOSED_DETECTED but recent HIGH FOOT_TRAFFIC';
        END IF;
    END IF;

    IF NEW.signal_type = 'FOOT_TRAFFIC' AND NEW.confidence_impact >= 5 THEN
        IF EXISTS (
            SELECT 1 FROM public.validation_signals 
            WHERE place_id = NEW.place_id 
              AND signal_type = 'CLOSED_DETECTED' 
              AND created_at > NOW() - INTERVAL '24 hours'
        ) THEN
            v_conflict_found := TRUE;
            v_penalty := GREATEST(v_penalty, 0.3);
            v_confidence_penalty := GREATEST(v_confidence_penalty, 20);
            v_conflict_reason := 'Conflict: HIGH FOOT_TRAFFIC but recently CLOSED_DETECTED';
        END IF;
    END IF;

    -- Rule 2: OCR_MENU + LOW_TRAFFIC -> suspicious
    IF NEW.signal_type = 'OCR_MENU' THEN
        IF EXISTS (
            SELECT 1 FROM public.validation_signals 
            WHERE place_id = NEW.place_id 
              AND signal_type = 'LOW_TRAFFIC' 
              AND created_at > NOW() - INTERVAL '24 hours'
        ) THEN
            v_conflict_found := TRUE;
            v_penalty := GREATEST(v_penalty, 0.15);
            v_confidence_penalty := GREATEST(v_confidence_penalty, 10);
            v_conflict_reason := 'Suspicious: OCR_MENU with recent LOW_TRAFFIC';
        END IF;
    END IF;
    
    IF NEW.signal_type = 'LOW_TRAFFIC' THEN
        IF EXISTS (
            SELECT 1 FROM public.validation_signals 
            WHERE place_id = NEW.place_id 
              AND signal_type = 'OCR_MENU' 
              AND created_at > NOW() - INTERVAL '24 hours'
        ) THEN
            v_conflict_found := TRUE;
            v_penalty := GREATEST(v_penalty, 0.15);
            v_confidence_penalty := GREATEST(v_confidence_penalty, 10);
            v_conflict_reason := 'Suspicious: LOW_TRAFFIC with recent OCR_MENU';
        END IF;
    END IF;

    -- Apply penalty if conflict was found
    IF v_conflict_found THEN
        -- Reduce consistency_score and confidence_score
        UPDATE public.places
        SET consistency_score = GREATEST(0.0, consistency_score - v_penalty),
            confidence_score = GREATEST(0, confidence_score - v_confidence_penalty)
        WHERE id = NEW.place_id;

        -- Store conflict in activity_logs
        -- Use schema: place_id, event_type, event_meta
        BEGIN
            INSERT INTO public.activity_logs (
                place_id,
                event_type,
                event_meta
            ) VALUES (
                NEW.place_id,
                'SIGNAL_CONFLICT',
                jsonb_build_object(
                    'reason', v_conflict_reason,
                    'consistency_penalty', v_penalty,
                    'confidence_penalty', v_confidence_penalty,
                    'trigger_signal', NEW.signal_type
                )
            );
        EXCEPTION WHEN undefined_table THEN
            NULL; -- Safely ignore if activity_logs doesn't match expected schema exactly in this environment
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS tr_check_consistency ON public.validation_signals;
CREATE TRIGGER tr_check_consistency
AFTER INSERT ON public.validation_signals
FOR EACH ROW EXECUTE FUNCTION public.check_signal_consistency();
