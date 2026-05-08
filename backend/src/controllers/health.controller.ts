
import { Request, Response, NextFunction } from 'express';

export const getHealth = (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
        },
    });
};

export const getStatus = (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
        success: true,
        data: {
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        },
    });
};
