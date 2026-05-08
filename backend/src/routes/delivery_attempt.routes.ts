import { Router } from 'express';
import { logDeliveryAttempt, getDeliveryAttemptsByPlace } from '../controllers/delivery_attempt.controller';
import { validateRequest } from '../middleware/validateRequest';
import { deliveryAttemptSchema } from '../schemas/delivery_attempt.schema';

const router = Router();

// POST /delivery-attempt
router.post('/', validateRequest(deliveryAttemptSchema), logDeliveryAttempt);

// GET /delivery-attempt/:place_id
router.get('/:place_id', getDeliveryAttemptsByPlace);

export default router;
