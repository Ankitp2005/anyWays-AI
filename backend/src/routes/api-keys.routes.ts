
import { Router } from 'express';
import { listApiKeys, createApiKey, revokeApiKey, getApiKeyUsage } from '../controllers/api-keys.controller';
import { validate } from '../middleware/validateRequest';
import { authenticateToken } from '../middleware/auth.middleware';
import { createApiKeySchema, revokeApiKeySchema } from '../schemas/apiKey.schema';

const router = Router();

router.use(authenticateToken); // Functionality requires user auth

router.get('/', listApiKeys);
router.get('/usage', getApiKeyUsage);
router.post('/', validate(createApiKeySchema), createApiKey);
router.delete('/:id', validate(revokeApiKeySchema), revokeApiKey);

export default router;
