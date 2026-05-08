import { z } from 'zod';

export const deliveryAttemptSchema = z.object({
    body: z.object({
        place_id: z.string().uuid('Invalid Place ID'),
        predicted_score: z.number().int().min(0).max(100),
        actual_outcome: z.enum(['SUCCESS', 'FAILED', 'CLOSED', 'UNKNOWN']),
        failure_reason: z.string().optional()
    })
});
