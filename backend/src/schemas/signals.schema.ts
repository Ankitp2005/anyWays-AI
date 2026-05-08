import { z } from 'zod';

export const ingestSignalSchema = z.object({
    body: z.object({
        placeId: z.string().uuid('Invalid Place ID'),
        signalType: z.enum([
            'FOOT_TRAFFIC',
            'OCR_MENU',
            'SOCIAL_SENTIMENT',
            'HOURS_VERIFIED',
            'PHONE_VERIFIED',
        ]),
        payload: z.record(z.string(), z.any()),
        confidenceImpact: z.number().int(),
    }),
});
