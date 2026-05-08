
import { z } from 'zod';

export const createPlaceSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        address: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        status: z.enum(['OPEN', 'CLOSED', 'TEMPORARILY_CLOSED', 'PERMANENTLY_CLOSED']).optional(),
    }),
});

export const updatePlaceSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        address: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        status: z.enum(['OPEN', 'CLOSED', 'TEMPORARILY_CLOSED', 'PERMANENTLY_CLOSED']).optional(),
    }),
    params: z.object({
        id: z.string().uuid('Invalid Place ID'),
    }),
});

export const getPlaceSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid Place ID'),
    }),
});

export const listPlacesSchema = z.object({

    query: z.object({
        page: z.string().regex(/^\d+$/, { message: 'Must be a number' }).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/, { message: 'Must be a number' }).transform(Number).optional(),
        status: z.enum(['OPEN', 'CLOSED', 'TEMPORARILY_CLOSED', 'PERMANENTLY_CLOSED']).optional(),
    }),
});

export const addSignalSchema = z.object({
    body: z.object({
        signalType: z.enum([
            'FOOT_TRAFFIC',
            'OCR_MENU',
            'SOCIAL_SENTIMENT',
            'HOURS_VERIFIED',
            'PHONE_VERIFIED',
        ]),
        signalValue: z.record(z.string(), z.any()), // JSON object
        confidenceImpact: z.number().int(),
    }),

    params: z.object({
        placeId: z.string().uuid({ message: 'Invalid Place ID' }),
    }),
});
