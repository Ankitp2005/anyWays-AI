
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { getRealProbability } from '../utils/probability';

export const getPlaces = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = (req as any).user.id;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status as any;

        const where = {
            userId,
            ...(status ? { status } : {})
        };

        const [places, total] = await Promise.all([
            prisma.place.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { signals: true } }
                }
            }),
            prisma.place.count({ where }),
        ]);

        const placesWithProb = await Promise.all(places.map(async (p) => {
            const signal_count = p._count.signals;
            const real_probability = await getRealProbability(p.confidenceScore);
            
            let trust_label = 'NORMAL';
            if (real_probability > 0.8 && signal_count > 50) trust_label = 'HIGH_CONFIDENCE';
            else if (signal_count < 10) trust_label = 'LOW_DATA';

            const { _count, ...rest } = p;
            return {
                ...rest,
                real_probability,
                signal_count,
                last_updated: p.lastValidatedAt || p.updatedAt,
                trust_label
            };
        }));

        res.status(200).json({
            success: true,
            data: {
                places: placesWithProb,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getPlace = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = req.params.id as string;
        const userId = (req as any).user.id;

        const place = await prisma.place.findFirst({
            where: { id, userId },
            include: {
                signals: true,
            },
        });

        if (!place) {
            return next(new AppError('Place not found or unauthorized', 404));
        }

        const signal_count = place.signals.length;
        const real_probability = await getRealProbability(place.confidenceScore);

        let trust_label = 'NORMAL';
        if (real_probability > 0.8 && signal_count > 50) trust_label = 'HIGH_CONFIDENCE';
        else if (signal_count < 10) trust_label = 'LOW_DATA';

        // Top 3 contributing signals with delta
        const top_signals = [...place.signals]
            .sort((a, b) => Math.abs(b.confidenceImpact) - Math.abs(a.confidenceImpact))
            .slice(0, 3)
            .map(s => ({
                signal_type: s.signalType,
                delta: s.confidenceImpact,
                detected_at: s.detectedAt
            }));

        res.status(200).json({
            success: true,
            data: {
                ...place,
                real_probability,
                signal_count,
                last_updated: place.lastValidatedAt || place.updatedAt,
                trust_label,
                explanation: {
                    summary: `Score is based on ${signal_count} total signals.`,
                    top_signals
                }
            },
        });
    } catch (error) {
        next(error);
    }
};

export const createPlace = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { name, address, latitude, longitude, status } = req.body;
        const userId = (req as any).user.id;

        const place = await prisma.place.create({
            data: {
                name,
                address,
                latitude,
                longitude,
                status,
                userId,
            },
        });

        res.status(201).json({
            success: true,
            data: place,
        });
    } catch (error) {
        next(error);
    }
};

export const updatePlace = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = req.params.id as string;
        const userId = (req as any).user.id;
        const data = req.body;

        // Check if place exists and belongs to user
        const existing = await prisma.place.findFirst({ where: { id, userId } });
        if (!existing) {
            return next(new AppError('Place not found or unauthorized', 404));
        }

        const place = await prisma.place.update({
            where: { id },
            data,
        });

        res.status(200).json({
            success: true,
            data: place,
        });
    } catch (error) {
        next(error);
    }
};

export const deletePlace = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = req.params.id as string;
        const userId = (req as any).user.id;

        // Check if place exists and belongs to user
        const existing = await prisma.place.findFirst({ where: { id, userId } });
        if (!existing) {
            return next(new AppError('Place not found or unauthorized', 404));
        }

        await prisma.place.delete({ where: { id } });

        res.status(200).json({
            success: true,
            data: null,
            message: 'Place deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

export const getPlaceSignals = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const placeId = req.params.placeId as string;

        const signals = await prisma.validationSignal.findMany({
            where: { placeId },
            orderBy: { detectedAt: 'desc' },
        });

        res.status(200).json({
            success: true,
            data: signals,
        });
    } catch (error) {
        next(error);
    }
};

export const addPlaceSignal = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const placeId = req.params.placeId as string;
        const { signalType, signalValue, confidenceImpact } = req.body;

        // Verify place exists
        const place = await prisma.place.findUnique({ where: { id: placeId } });
        if (!place) {
            return next(new AppError('Place not found', 404));
        }

        const signal = await prisma.validationSignal.create({
            data: {
                placeId,
                signalType,
                signalValue,
                confidenceImpact,
            },
        });

        // Optionally update place confidence score here
        // This could be a separate background job or integrated logic
        // For now, simple addition
        const newScore = place.confidenceScore + confidenceImpact;
        await prisma.place.update({
            where: { id: placeId },
            data: { confidenceScore: newScore, lastValidatedAt: new Date() },
        });

        res.status(201).json({
            success: true,
            data: signal,
        });
    } catch (error) {
        next(error);
    }
};
