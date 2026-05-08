import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth.utils';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';
import Logger from '../utils/logger';

export const authenticateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        Logger.warn('Auth Failure: Missing token', { ip: req.ip, url: req.originalUrl });
        return next(new AppError('Authentication token missing', 401));
    }

    const decoded = verifyAccessToken(token);

    if (!decoded) {
        Logger.warn('Auth Failure: Invalid or expired token', { ip: req.ip, url: req.originalUrl });
        return next(new AppError('Invalid or expired token', 401));
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            Logger.warn(`Auth Failure: Token valid but user ${decoded.userId} not found`, { ip: req.ip, url: req.originalUrl });
            return next(new AppError('User not found', 401));
        }

        (req as any).user = user;
        next();
    } catch (error) {
        next(error);
    }
};
