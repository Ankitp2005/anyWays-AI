/**
 * scoring_logic_verification.ts
 * 
 * Local test suite to verify the anyWays Confidence Scoring Engine.
 * Verifies diminishing returns, negative signal damping, and anti-spam logic.
 */

import { calculateConfidenceScore, getScoreLabel } from '../../supabase/functions/shared/scoring.ts';

function runTest(name: string, currentScore: number, impact: number, expectedRange: [number, number]) {
    const newScore = calculateConfidenceScore(currentScore, impact);
    const label = getScoreLabel(newScore);
    const pass = newScore >= expectedRange[0] && newScore <= expectedRange[1];
    
    console.log(`[${pass ? '✅' : '❌'}] ${name}`);
    console.log(`    Current: ${currentScore} | Impact: ${impact} | New: ${newScore} (${label})`);
    if (!pass) {
        console.error(`    FAILED: Expected between ${expectedRange[0]} and ${expectedRange[1]}`);
    }
}

console.log('🚀 Starting Confidence Engine Verification...\n');

// ── Case 1: Single Strong Signal ─────────────────────────────────────────────
// Start: 50, Impact: 25. 
// Expected: 50 + (25 * (1 - 0.5)) = 50 + 12.5 = 62.5 -> 63
runTest('Single Strong Signal (Resistance Test)', 50, 25, [60, 65]);

// ── Case 2: Multiple Signals (Approaching 100) ───────────────────────────────
// When score is high, impact should be tiny.
// Start: 90, Impact: 20.
// Expected: 90 + (20 * (1 - 0.9)) = 90 + 2 = 92
runTest('Approaching 100 (Diminishing Returns)', 90, 20, [91, 93]);

// ── Case 3: Negative Signal (Damping Test) ───────────────────────────────────
// Start: 80, Impact: -20.
// Damped Impact: -20 * 0.5 = -10
// Expected: 80 + (-10 * (1 - 0.8)) = 80 - 2 = 78
runTest('Negative Signal (Damping + Resilience)', 80, -20, [77, 79]);

// ── Case 4: Repeated Signal (Simulated) ──────────────────────────────────────
// If a duplicate is detected, impact is halved again (external to this function, 
// but we test the mathematical outcome).
// Start: 60, Impact: 20 (halved to 10 for duplicate)
// Expected: 60 + (10 * (1 - 0.6)) = 60 + 4 = 64
runTest('Repeated Signal (Simulated Impact Reduction)', 60, 10, [63, 65]);

// ── Case 5: Edge Cases ───────────────────────────────────────────────────────
runTest('Max Cap (100)', 99, 100, [100, 100]);
runTest('Min Cap (0)', 1, -50, [0, 0]);
runTest('Zero Impact', 50, 0, [50, 50]);

console.log('\n🏁 Verification Finished.');
