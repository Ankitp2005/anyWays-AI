/**
 * scoringWeights.ts
 * Centralized signal impact configuration for the anyWays Confidence Engine.
 */

export type SignalType = 
    | 'FOOT_TRAFFIC' 
    | 'OCR_MENU' 
    | 'SOCIAL_SENTIMENT' 
    | 'HOURS_VERIFIED' 
    | 'PHONE_VERIFIED' 
    | 'PICKUP_LOCATION_VERIFIED'
    | 'CLOSED_DETECTED'
    | 'LOW_TRAFFIC'
    | 'GPS_ARRIVAL_VERIFIED'
    | 'REAL_DWELL_TIME'
    | 'DEVICE_VERIFIED_PRESENCE';

/**
 * Base impact weights for each signal type.
 * Rationale: High-trust physical verifications (PICKUP_LOCATION) carry more 
 * weight than noisy digital signals (SOCIAL_SENTIMENT).
 */
export const SIGNAL_WEIGHTS: Record<SignalType, number> = {
    FOOT_TRAFFIC:            15,
    OCR_MENU:                15,
    SOCIAL_SENTIMENT:         8,
    HOURS_VERIFIED:          10,
    PHONE_VERIFIED:           8,
    PICKUP_LOCATION_VERIFIED: 35,
    CLOSED_DETECTED:        -30,   // Large negative — strong evidence of closure
    LOW_TRAFFIC:             -10,  // Mild negative — may be temporary
    GPS_ARRIVAL_VERIFIED:    25,
    REAL_DWELL_TIME:         20,
    DEVICE_VERIFIED_PRESENCE:30,
};

/**
 * getSignalImpact
 * 
 * Calculates the final impact score for a signal based on its type and payload.
 * Supports dynamic bonuses, negative impacts, and enforces system-wide caps.
 * 
 * @param type  The type of validation signal
 * @param value The arbitrary JSONB payload from the signal
 * @returns     Calculated impact integer (Max 45, Min -45)
 */
export function getSignalImpact(type: SignalType, value: any): number {
    let impact = SIGNAL_WEIGHTS[type] || 5;

    // ── Dynamic Adjustments ──────────────────────────────────────────────────
    switch (type) {
        case 'FOOT_TRAFFIC':
            // Bonus for high occupancy (active location)
            if (value?.occupancy_percent > 80) {
                impact += 2;
            }
            // Penalty if count is suspiciously low but location is active
            if (value?.count < 5) {
                impact -= 3;
            }
            break;

        case 'SOCIAL_SENTIMENT':
            // Negative sentiment flips the impact to negative
            if (value?.sentiment === 'negative') {
                impact = -impact;
            } else if (value?.sentiment === 'positive') {
                impact += 2; // Positive brand mention bonus
            }
            break;

        case 'OCR_MENU':
            // More items detected = more confidence in menu freshness
            if (value?.items_detected > 20) impact += 5;
            if (value?.items_detected === 0) impact = -10; // Menu scan failed
            break;

        case 'PHONE_VERIFIED':
            // Disconnected number is a major negative signal
            if (value?.status === 'disconnected') {
                impact = -20;
            }
            break;

        case 'HOURS_VERIFIED':
            // Mismatch with listed hours
            if (value?.matches === false) {
                impact = -15;
            }
            break;

        case 'PICKUP_LOCATION_VERIFIED':
            // Dwell time adds confidence that it's a real pickup, not a drive-by
            if (value?.dwell_time_mins > 5) {
                impact += 5;
            }
            break;

        case 'CLOSED_DETECTED':
            // Severity-based: permanently_closed is worse than temporarily_closed
            if (value?.closure_type === 'permanent') {
                impact = -50;  // Maximum negative
            } else if (value?.closure_type === 'temporary') {
                impact = -30;  // Recoverable
            }
            // Multiple independent reports increase severity
            if (value?.report_count && value.report_count >= 3) {
                impact -= 10;
            }
            break;

        case 'LOW_TRAFFIC':
            // Scale based on how low the traffic actually is
            if (value?.occupancy_percent !== undefined && value.occupancy_percent < 5) {
                impact = -20;  // Near-zero traffic is more concerning
            } else {
                impact = -10;   // Just below normal
            }
            break;
    }

    // ── System Guardrails ───────────────────────────────────────────────────
    // Clamp impact to [-45, 45] to prevent any single signal from overpowering the system.
    return Math.max(-45, Math.min(45, impact));
}
