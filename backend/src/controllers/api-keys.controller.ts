
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { generateApiKey } from '../utils/apiKey.utils';
import { AppError } from '../utils/AppError';

export const listApiKeys = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = (req as any).user.id;
        const keys = await prisma.apiKey.findMany({
            where: { userId, revokedAt: null },
            select: {
                id: true,
                name: true,
                permissions: true,
                createdAt: true,
                lastUsedAt: true,
                // NEVER return keyHash
            }
        });
        res.status(200).json({ success: true, data: keys });
    } catch (error) {
        next(error);
    }
};

export const createApiKey = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = (req as any).user.id;
        const { name, permissions = ['read'] } = req.body;

        const { key, hash } = generateApiKey();

        const newKey = await prisma.apiKey.create({
            data: {
                userId,
                name,
                keyHash: hash,
                permissions,
            },
        });

        res.status(201).json({
            success: true,
            data: {
                id: newKey.id,
                name: newKey.name,
                key: key, // Returned ONLY once
                createdAt: newKey.createdAt,
                permissions: newKey.permissions,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const revokeApiKey = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = (req as any).user.id;
        const id = req.params.id as string;

        const key = await prisma.apiKey.findFirst({
            where: { id, userId }
        });

        if (!key) {
            return next(new AppError('API Key not found', 404));
        }

        await prisma.apiKey.update({
            where: { id },
            data: { revokedAt: new Date() }
        });

        res.status(200).json({ success: true, message: 'API Key revoked successfully', data: null });
    } catch (error) {
        next(error);
    }
};
