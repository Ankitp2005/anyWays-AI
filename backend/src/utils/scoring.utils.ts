interface Signal {
    signalType: 'FOOT_TRAFFIC' | 'OCR_MENU' | 'SOCIAL_SENTIMENT' | 'HOURS_VERIFIED' | 'PHONE_VERIFIED' | 'CLOSED_DETECTED' | 'LOW_TRAFFIC' | 'PICKUP_LOCATION_VERIFIED';
    confidenceImpact: number; // Raw delta value (can be negative)
    detectedAt: Date;
    trustScore?: number; // Added trust score from API key
}

const TYPE_WEIGHTS: Record<Signal['signalType'], number> = {
    OCR_MENU: 1.0,           // Hard visual proof
    HOURS_VERIFIED: 0.9,     // Direct verification
    FOOT_TRAFFIC: 0.8,       // Strong proxy metric
    PHONE_VERIFIED: 0.7,     // Active contact but less location-proof
    SOCIAL_SENTIMENT: 0.3,   // Noisy proxy
    CLOSED_DETECTED: 1.0,    // Full weight — closure is critical evidence
    LOW_TRAFFIC: 0.6,        // Moderate weight — could be temporary
    PICKUP_LOCATION_VERIFIED: 1.0, // High confidence signal
};

// New time-decay constant based on age in hours
const LAMBDA = 0.08;

/**
 * Calculates the dynamic confidence score of a Place based on its historical signals.
 * @param signals Array of validation signals for the place
 * @returns Computed confidence score (0 to 100)
 */
export const calculateConfidenceScore = (signals: Signal[]): number => {
    const now = new Date().getTime();

    const totalScore = signals.reduce((acc, signal) => {
        // 1. Base Impact
        const baseImpact = signal.confidenceImpact;

        // 2. Trust Scaling (Feature: Trust Scoring Layer)
        // Default to 0.5 if not provided (neutral trust)
        const trustMultiplier = signal.trustScore ?? 0.5;

        // 3. Type Weighting
        const weight = TYPE_WEIGHTS[signal.signalType] || 0.5;

        // 4. Time Decay (Recency Bias) - based on age in hours
        const hoursElapsed = Math.max(0, (now - signal.detectedAt.getTime()) / (1000 * 60 * 60));
        const timeDecay = Math.exp(-LAMBDA * hoursElapsed);

        // Calculate Adjusted Impact: weight * trust * decay
        const adjustedImpact = baseImpact * weight * trustMultiplier * timeDecay;

        return acc + adjustedImpact;
    }, 0);

    // Bound the score tightly between 0 and 100
    return Math.round(Math.max(0, Math.min(100, totalScore)));
};
