
import { z } from 'zod';

export const createApiKeySchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        permissions: z.array(z.enum(['read', 'write'])).optional(),
    }),
});

export const revokeApiKeySchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid API Key ID'),
    }),
});
