/**
 * Confidence Scoring Engine
 * ─────────────────────────
 * Computes a 0–100 confidence score for a place based on its validation signals.
 *
 * Algorithm:
 *   For each signal:
 *     contribution = confidence_impact × type_weight × time_decay
 *
 *   type_weight   — reliability of the signal source (see TYPE_WEIGHTS)
 *   time_decay    — exponential decay with 30-day half-life (recent signals matter more)
 *
 *   Bonus:
 *     +5 pts if signals from ≥ 3 distinct signal types (corroboration bonus)
 *
 *   Final score clamped to [0, 100].
 *
 * Integration:
 *   Called by supabase/functions/signals/index.ts (Step 3) after every new signal INSERT.
 *   Result written back to places.confidence_score + places.last_validated_at.
 */

import { SignalType, SIGNAL_WEIGHTS, getSignalImpact } from './scoringWeights.ts';

export interface Signal {
    signal_type:       SignalType;
    confidence_impact: number;
    detected_at:       string;
}

// ── Re-exporting for compatibility with existing imports ───────────────────────
export { getSignalImpact as calculateSignalImpact };

// ── Time Decay ────────────────────────────────────────────────────────────────
// Signals lose relevance over time. After HALF_LIFE_DAYS days, a signal
// contributes 50% of its original weight. After 60 days → 25%, etc.
const HALF_LIFE_DAYS = 30;
const LAMBDA         = Math.LN2 / HALF_LIFE_DAYS; // decay constant

// ── Corroboration Bonus ───────────────────────────────────────────────────────
// If signals come from ≥ MIN_TYPES distinct sources, add a bonus.
// Rationale: agreeing evidence from multiple independent sources is stronger
// than many signals of the same type.
const CORROBORATION_BONUS     = 5;
const MIN_TYPES_FOR_BONUS     = 3;

/**
 * isDuplicateSignal
 * 
 * Checks if a signal of the same type has been received for this place
 * within a specific time window. Used to prevent impact spamming from
 * a single source.
 * 
 * @param supabase  Supabase client (service role)
 * @param placeId   Target place ID
 * @param type      Signal type to check
 * @param windowMin Time window in minutes
 */
export const isDuplicateSignal = async (
    supabase: any, 
    placeId: string, 
    type: string, 
    windowMin: number = 60
): Promise<boolean> => {
    const windowStart = new Date(Date.now() - windowMin * 60 * 1000).toISOString();

    const { count, error } = await supabase
        .from('validation_signals')
        .select('*', { count: 'exact', head: true })
        .eq('place_id', placeId)
        .eq('signal_type', type)
        .gte('created_at', windowStart);

    if (error) {
        console.error('[Scoring] Error checking duplicates:', error);
        return false;
    }

    return (count || 0) > 0;
};

/**
 * calculateConfidenceScore
 * 
 * Implements a weighted incremental scoring algorithm with diminishing returns
 * and damped negative signal handling.
 * 
 * @param currentScore The existing confidence_score of the place (0–100)
 * @param impact       The raw impact value of the new signal
 * @returns            The updated score, clamped and rounded
 */
export const calculateConfidenceScore = (currentScore: number, impact: number): number => {
    // 1. Handle Negative Signal Damping
    // We apply a 50% damping factor to negative signals to prevent 
    // single negative reports from causing drastic drops in confidence.
    const adjustedImpact = impact < 0 ? impact * 0.5 : impact;

    // 2. Calculate the gain using diminishing returns formula
    // multiplier = (1 - currentScore / 100)
    // Rationale: High scores are more resistant to both gain and loss, 
    // reflecting that "established" trust requires more evidence to shift.
    const multiplier = 1 - (currentScore / 100);
    const change = adjustedImpact * multiplier;

    // 3. Compute new score
    const newScore = currentScore + change;

    // 4. Clamping and Rounding
    return Math.min(100, Math.max(0, Math.round(newScore)));
};

/**
 * getScoreLabel
 *
 * Maps a numeric confidence score to a human-readable tier.
 * Used in frontend badge rendering and API responses.
 *
 * 90–100 → CONFIRMED      (highest confidence — strong corroboration)
 * 70–89  → LIKELY_VALID   (high confidence — multiple positive signals)
 * 40–69  → UNVERIFIED     (moderate confidence — requires more data)
 *  0–39  → LOW_CONFIDENCE (no meaningful signals yet)
 */
export type ConfidenceTier = 'CONFIRMED' | 'LIKELY_VALID' | 'UNVERIFIED' | 'LOW_CONFIDENCE';

export const getScoreLabel = (score: number): ConfidenceTier => {
    if (score >= 90) return 'CONFIRMED';
    if (score >= 70) return 'LIKELY_VALID';
    if (score >= 40) return 'UNVERIFIED';
    return 'LOW_CONFIDENCE';
};

// Re-export for compatibility with older code if needed
export { getScoreLabel as scoreLabel };
