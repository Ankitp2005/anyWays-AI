import { PrismaClient, PlaceStatus, SignalType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Create a User
    const user = await prisma.user.upsert({
        where: { email: 'dev@anyways.com' },
        update: {},
        create: {
            email: 'dev@anyways.com',
            passwordHash: 'hashed_password_123', // In real app, use bcrypt
            name: 'Dev User',
        },
    });

    console.log({ user });

    // 2. Create an API Key
    const apiKey = await prisma.apiKey.create({
        data: {
            userId: user.id,
            name: 'Default Dev Key',
            keyHash: 'hashed_sk_live_123456789', // Mock hash
            permissions: ['read', 'write', 'admin'],
        },
    });

    console.log({ apiKey });

    // 3. Create a Place
    const place = await prisma.place.create({
        data: {
            userId: user.id,
            name: 'Chai Point - Indiranagar',
            address: '12th Main Rd, Indiranagar, Bengaluru, Karnataka 560038',
            status: PlaceStatus.OPEN,
            confidenceScore: 98,
            lastValidatedAt: new Date(),
            signals: {
                create: [
                    {
                        signalType: SignalType.FOOT_TRAFFIC,
                        signalValue: { count: 120, duration: '1h' },
                        confidenceImpact: 10,
                        detectedAt: new Date(),
                    },
                    {
                        signalType: SignalType.OCR_MENU,
                        signalValue: { detectedItems: 45, language: 'en' },
                        confidenceImpact: 15,
                        detectedAt: new Date(),
                    },
                ],
            },
        },
    });

    console.log({ place });

    // 4. Create Delivery Attempts
    const deliveryAttempts = [
        { predictedScore: 95, predictedLabel: 'VERY_LIKELY', actualOutcome: 'SUCCESS' as const },
        { predictedScore: 92, predictedLabel: 'VERY_LIKELY', actualOutcome: 'SUCCESS' as const },
        { predictedScore: 88, predictedLabel: 'LIKELY',      actualOutcome: 'SUCCESS' as const },
        { predictedScore: 85, predictedLabel: 'LIKELY',      actualOutcome: 'SUCCESS' as const },
        { predictedScore: 78, predictedLabel: 'LIKELY',      actualOutcome: 'SUCCESS' as const },
        { predictedScore: 72, predictedLabel: 'LIKELY',      actualOutcome: 'CLOSED' as const, failureReason: 'Store closed early for maintenance' },
        { predictedScore: 65, predictedLabel: 'NEUTRAL',     actualOutcome: 'SUCCESS' as const },
        { predictedScore: 60, predictedLabel: 'NEUTRAL',     actualOutcome: 'FAILED' as const,  failureReason: 'Invalid location PIN' },
        { predictedScore: 55, predictedLabel: 'NEUTRAL',     actualOutcome: 'SUCCESS' as const },
        { predictedScore: 48, predictedLabel: 'UNLIKELY',    actualOutcome: 'FAILED' as const,  failureReason: 'Entry denied by security' },
        { predictedScore: 42, predictedLabel: 'UNLIKELY',    actualOutcome: 'CLOSED' as const, failureReason: 'Renovation in progress' },
        { predictedScore: 35, predictedLabel: 'UNLIKELY',    actualOutcome: 'FAILED' as const,  failureReason: 'Place does not exist at coordinates' },
        { predictedScore: 28, predictedLabel: 'VERY_UNLIKELY', actualOutcome: 'FAILED' as const, failureReason: 'Demolished building' },
        { predictedScore: 25, predictedLabel: 'VERY_UNLIKELY', actualOutcome: 'FAILED' as const, failureReason: 'Permanently closed' },
        { predictedScore: 22, predictedLabel: 'VERY_UNLIKELY', actualOutcome: 'FAILED' as const, failureReason: 'Incorrect address mapping' },
    ];

    for (const attempt of deliveryAttempts) {
        await prisma.deliveryAttempt.create({
            data: {
                placeId: place.id,
                ...attempt,
            },
        });
    }

    console.log(`Created ${deliveryAttempts.length} delivery attempts.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
