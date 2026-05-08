import { Router } from 'express';
import { ingestSignal } from '../controllers/signals.controller';
import { validate } from '../middleware/validateRequest';
import { ingestSignalSchema } from '../schemas/signals.schema';
import { combinedAuth } from '../middleware/combinedAuth';

const router = Router();

// Secure ingestion endpoint using combined auth (JWT/API Key)
router.use(combinedAuth);
router.post('/', validate(ingestSignalSchema), ingestSignal);

export default router;
