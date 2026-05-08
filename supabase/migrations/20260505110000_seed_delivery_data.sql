-- =============================================================================
-- Seed Test Data: Delivery Attempts
-- =============================================================================

DO $$
DECLARE
    v_place_id UUID;
BEGIN
    -- Get the first available place_id
    SELECT id INTO v_place_id FROM public.places LIMIT 1;

    -- If no place exists, create a dummy one for testing
    IF v_place_id IS NULL THEN
        INSERT INTO public.places (
            name, 
            address, 
            status, 
            confidence_score
        ) VALUES (
            'Test Place - Indiranagar',
            '12th Main Rd, Indiranagar, Bengaluru',
            'OPEN',
            85
        ) RETURNING id INTO v_place_id;
    END IF;

    -- Insert 15 rows with varied predicted_score (20 -> 95)
    -- Realistic distribution: high score -> mostly SUCCESS, low score -> mostly FAILED
    
    INSERT INTO public.delivery_attempts (place_id, predicted_score, predicted_label, actual_outcome, failure_reason)
    VALUES
        (v_place_id, 95, 'VERY_LIKELY', 'SUCCESS', NULL),
        (v_place_id, 92, 'VERY_LIKELY', 'SUCCESS', NULL),
        (v_place_id, 88, 'LIKELY',      'SUCCESS', NULL),
        (v_place_id, 85, 'LIKELY',      'SUCCESS', NULL),
        (v_place_id, 78, 'LIKELY',      'SUCCESS', NULL),
        (v_place_id, 72, 'LIKELY',      'CLOSED',  'Store closed early for maintenance'),
        (v_place_id, 65, 'NEUTRAL',     'SUCCESS', NULL),
        (v_place_id, 60, 'NEUTRAL',     'FAILED',  'Invalid location PIN'),
        (v_place_id, 55, 'NEUTRAL',     'SUCCESS', NULL),
        (v_place_id, 48, 'UNLIKELY',    'FAILED',  'Entry denied by security'),
        (v_place_id, 42, 'UNLIKELY',    'CLOSED',  'Renovation in progress'),
        (v_place_id, 35, 'UNLIKELY',    'FAILED',  'Place does not exist at coordinates'),
        (v_place_id, 28, 'VERY_UNLIKELY', 'FAILED', 'Demolished building'),
        (v_place_id, 25, 'VERY_UNLIKELY', 'FAILED', 'Permanently closed'),
        (v_place_id, 22, 'VERY_UNLIKELY', 'FAILED', 'Incorrect address mapping');

END $$;
