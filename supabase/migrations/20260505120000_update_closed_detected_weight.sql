-- =============================================================================
-- Update: Hardened Negative Signal Weights
-- =============================================================================

-- Increase the negative impact of CLOSED_DETECTED signals to ensure 
-- that detected closures more aggressively lower the confidence score.
-- Previous base_weight: -30
-- New base_weight: -50

UPDATE public.signal_weights 
SET base_weight = -50, 
    reliability_score = 0.95
WHERE signal_type = 'CLOSED_DETECTED';

-- Optionally, slightly increase LOW_TRAFFIC negative impact as well
-- Previous base_weight: -10
-- New base_weight: -15
UPDATE public.signal_weights 
SET base_weight = -15
WHERE signal_type = 'LOW_TRAFFIC';
