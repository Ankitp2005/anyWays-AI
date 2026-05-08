import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import crypto from 'crypto';
import { AppError } from '../utils/AppError';
import Logger from '../utils/logger';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
        Logger.warn('API Key Auth Failure: Missing x-api-key header', { ip: req.ip, url: req.originalUrl });
        return next(new AppError('API Key is missing', 401));
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    try {
        const validKey = await prisma.apiKey.findFirst({
            where: {
                keyHash: keyHash,
                revokedAt: null,
            },
            include: {
                user: true,
            },
        });

        if (!validKey) {
            Logger.warn('API Key Auth Failure: Invalid or Revoked API Key used', { ip: req.ip, url: req.originalUrl });
            return next(new AppError('Invalid API Key', 401));
        }

        // Attach user to request
        (req as any).user = validKey.user;

        // Telemetry Tracking - Async after response finishes
        res.on('finish', () => {
            Promise.all([
                // 1. Update the 'lastUsedAt' timestamp
                prisma.apiKey.update({
                    where: { id: validKey.id },
                    data: { lastUsedAt: new Date() },
                }),
                // 2. Insert into the ApiKeyUsage model
                prisma.apiKeyUsage.create({
                    data: {
                        apiKeyId: validKey.id,
                        endpoint: req.originalUrl,
                        method: req.method,
                        statusCode: res.statusCode,
                    }
                })
            ]).catch(err => {
                Logger.error(`Failed to record API key telemetry: ${err.message}`);
            });
        });

        next();
    } catch (error) {
        next(error);
    }
};
