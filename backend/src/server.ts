import app from './app';
import { config } from './config';
import prisma from './utils/prisma';
import Logger from './utils/logger';

const PORT = config.port || 3000;

const startServer = async () => {
    try {
        // 1. Verify Prisma Connection Health
        await prisma.$connect();
        Logger.info('Database connection established successfully.');

        // 2. Start Express Server
        const server = app.listen(PORT, () => {
            Logger.info(`Server running on port ${PORT} in ${config.env} mode`);
        });

        // 3. Graceful Shutdown handlers
        const shutdown = async () => {
            Logger.info('SIGTERM/SIGINT received. Shutting down gracefully...');
            server.close(async () => {
                await prisma.$disconnect();
                process.exit(0);
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        Logger.error(`Failed to start server: ${error}`);
        process.exit(1);
    }
};

startServer();

// Handle unexpected async errors
process.on('unhandledRejection', (err) => {
    Logger.error(`Unhandled Rejection: ${err}`);
});
