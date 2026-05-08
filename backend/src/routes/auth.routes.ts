
import { Router } from 'express';
import { register, login, refresh, logout, me } from '../controllers/auth.controller';
import { validate } from '../middleware/validateRequest';
import { authenticateToken } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter';
import { registerSchema, loginSchema, refreshTokenSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refresh);
router.post('/logout', logout);
router.get('/me', authenticateToken, me);

export default router;
