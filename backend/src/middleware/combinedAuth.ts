import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from './auth.middleware';
import { requireAuth } from './auth';

// Tries JWT first, if missing/fails, falls back to API Key
export const combinedAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authenticateToken(req, res, next);
    }
    // Fallback to checking x-api-key
    return requireAuth(req, res, next);
};
