
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { hashApiKey } from '../utils/apiKey.utils';
import { AppError } from '../utils/AppError';

// In-memory rate limiting store: { apiKeyId: { count, resetTime } }
const rateLimitStore: Record<string, { count: number; resetTime: number }> = {};

export const authenticateApiKey = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const apiKey = req.header('X-API-Key');

    if (!apiKey) {
        return next(new AppError('API Key missing', 401));
    }

    const hashedKey = hashApiKey(apiKey);

    try {
        const keyRecord = await prisma.apiKey.findFirst({
            where: {
                keyHash: hashedKey,
                revokedAt: null,
            },
            include: {
                user: true,
            },
        });

        if (!keyRecord) {
            return next(new AppError('Invalid or revoked API Key', 403));
        }

        // Attach key and user to request
        (req as any).apiKey = keyRecord;
        (req as any).user = keyRecord.user;

        // Update last used asynchronously
        prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: { lastUsedAt: new Date() },
        }).catch(() => { });

        next();
    } catch (error) {
        next(error);
    }
};

export const apiKeyRateLimiter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const apiKey = (req as any).apiKey;
    if (!apiKey) return next();

    const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    const limit = isWrite ? 20 : 100;
    const windowMs = 60 * 60 * 1000; // 1 hour

    const now = Date.now();
    const key = apiKey.id;

    if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
        rateLimitStore[key] = { count: 1, resetTime: now + windowMs };
    } else {
        rateLimitStore[key].count++;
    }

    if (rateLimitStore[key].count > limit) {
        res.setHeader('Retry-After', Math.ceil((rateLimitStore[key].resetTime - now) / 1000));
        return next(new AppError('API Key rate limit exceeded', 429));
    }

    next();
};

export const trackApiKeyUsage = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const apiKey = (req as any).apiKey;
    if (!apiKey) return next();

    // Hook into response finish to capture status code
    res.on('finish', () => {
        prisma.apiKeyUsage.create({
            data: {
                apiKeyId: apiKey.id,
                endpoint: req.originalUrl,
                method: req.method,
                statusCode: res.statusCode,
            }
        }).catch((err) => console.error('Failed to log API usage', err));
    });

    next();
};
