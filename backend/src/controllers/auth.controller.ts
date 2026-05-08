
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';
import {
    hashPassword,
    comparePassword,
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from '../utils/auth.utils';

export const register = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { email, password, name } = req.body;

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return next(new AppError('Email already in use', 400));
        }

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: hashedPassword,
                name,
            },
        });

        const accessToken = generateAccessToken({ userId: user.id, email: user.email });
        const refreshToken = generateRefreshToken({ userId: user.id });

        // Store refresh token
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
            },
        });

        res.status(201).json({
            success: true,
            data: {
                user: { id: user.id, email: user.email, name: user.name },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || !(await comparePassword(password, user.passwordHash))) {
            return next(new AppError('Invalid email or password', 401));
        }

        const accessToken = generateAccessToken({ userId: user.id, email: user.email });
        const refreshToken = generateRefreshToken({ userId: user.id });

        // Store refresh token
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
            },
        });

        res.status(200).json({
            success: true,
            data: {
                user: { id: user.id, email: user.email, name: user.name },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const refresh = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { refreshToken } = req.body;

        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded) {
            return next(new AppError('Invalid refresh token', 401));
        }

        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
        });

        if (!storedToken || storedToken.revoked) {
            return next(new AppError('Invalid or revoked refresh token', 401));
        }

        const user = await prisma.user.findUnique({
            where: { id: storedToken.userId },
        });

        if (!user) {
            return next(new AppError('User not found', 401));
        }

        // Revoke old token and issue new pair (Rotation)
        await prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revoked: true },
        });

        const newAccessToken = generateAccessToken({ userId: user.id, email: user.email });
        const newRefreshToken = generateRefreshToken({ userId: user.id });

        await prisma.refreshToken.create({
            data: {
                token: newRefreshToken,
                userId: user.id,
            },
        });

        res.status(200).json({
            success: true,
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const logout = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            // Try to revoke, ignore if not found
            try {
                await prisma.refreshToken.update({
                    where: { token: refreshToken },
                    data: { revoked: true },
                });
            } catch (err) { }
        }

        res.status(200).json({
            success: true,
            data: null,
            message: 'Logged out successfully',
        });
    } catch (error) {
        next(error);
    }
};

export const me = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    res.status(200).json({
        success: true,
        data: {
            id: user.id,
            email: user.email,
            name: user.name,
        },
    });
};
