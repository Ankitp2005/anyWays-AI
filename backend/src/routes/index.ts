import { Router } from 'express';
import healthRoutes from './health.routes';
import placesRoutes from './places.routes';
import apiKeysRoutes from './api-keys.routes';
import authRoutes from './auth.routes';
import signalsRoutes from './signals.routes';
import analyticsRoutes from './analytics.routes';
import deliveryAttemptRoutes from './delivery_attempt.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/places', placesRoutes);
router.use('/api-keys', apiKeysRoutes);
router.use('/auth', authRoutes);
router.use('/signals', signalsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/delivery-attempt', deliveryAttemptRoutes);

export default router;
