import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import Logger from '../utils/logger';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let details: any = null;

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    } else if (err instanceof ZodError) {
        statusCode = 400;
        message = 'Validation Error';
        details = (err as ZodError).issues;
    } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        statusCode = 400;
        message = 'Database Query Error';
        details = { prismaCode: err.code, meta: err.meta };
    }

    // Log the error with structured metadata
    Logger.error(`[ERROR] ${statusCode} - ${message}`, {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userId: (req as any).user?.id || 'Anonymous',
        stack: err.stack,
        details
    });

    res.status(statusCode).json({
        success: false,
        error: {
            code: statusCode,
            message,
            ...(process.env.NODE_ENV === 'development' && { details, stack: err.stack }),
        },
    });
};
