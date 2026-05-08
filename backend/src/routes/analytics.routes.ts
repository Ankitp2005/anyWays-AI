import { Router } from 'express';
import { getDashboardAnalytics } from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Route to get analytics dashboard data
router.get('/dashboard', requireAuth, getDashboardAnalytics);

export default router;
