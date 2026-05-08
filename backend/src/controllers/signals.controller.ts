import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { calculateConfidenceScore } from '../utils/scoring.utils';

export const ingestSignal = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { placeId, signalType, payload, confidenceImpact } = req.body;
        const userId = (req as any).user.id;

        // DISTRIBUTED SYSTEM PATTERN: 
        // 1. Immutable Event Sourcing (append-only signal table)
        // 2. Atomic Transactions to prevent race conditions on concurrent score updates
        const result = await prisma.$transaction(async (tx) => {
            // Verify ownership to prevent IDOR vulnerabilities
            const place = await tx.place.findFirst({
                where: { id: placeId, userId },
                select: { id: true }
            });

            if (!place) {
                throw new AppError('Place not found or unauthorized', 404);
            }

            const apiKeyId = (req as any).apiKeyId; // Assuming middleware sets this
            let trustScore = 0.5;

            if (apiKeyId) {
                const trustRecord = await tx.apiKeyTrust.findUnique({
                    where: { apiKeyId }
                });
                trustScore = trustRecord?.trustScore ?? 0.5;
            }

            // Insert Immutable Event with Key Tracking
            const signal = await tx.validationSignal.create({
                data: {
                    placeId,
                    apiKeyId,
                    signalType,
                    signalValue: payload,
                    confidenceImpact,
                }
            });

            // Fetch ALL signals with their respective API Key trust scores
            const allSignalsData = await tx.validationSignal.findMany({
                where: { placeId },
                include: {
                    apiKey: {
                        include: { trust: true }
                    }
                }
            });

            // Map to the format expected by the utility, including trustScore
            const signalsWithTrust = allSignalsData.map(s => ({
                signalType: s.signalType,
                confidenceImpact: s.confidenceImpact,
                detectedAt: s.detectedAt,
                trustScore: s.apiKey?.trust?.trustScore ?? 0.5
            }));

            // Run the Data Science algorithm
            const recalculatedScore = calculateConfidenceScore(signalsWithTrust as any);

            // Atomic update of the materialized view (Place table)
            const updatedPlace = await tx.place.update({
                where: { id: placeId },
                data: { 
                    confidenceScore: recalculatedScore,
                    lastValidatedAt: new Date()
                }
            });

            return { signal, place: updatedPlace };
        });

        res.status(202).json({
            success: true,
            message: "Validation signal ingested and confidence recalculated",
            data: result
        });
    } catch (error) {
        next(error);
    }
};
