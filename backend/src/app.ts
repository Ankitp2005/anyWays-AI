
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import Logger from './utils/logger';
import { AppError } from './utils/AppError';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use((req, res, next) => {
    const start = performance.now();
    
    // Log response when finished
    res.on('finish', () => {
        const duration = (performance.now() - start).toFixed(2);
        const userId = (req as any).user?.id || 'Anonymous';
        
        const meta = {
            userId,
            ip: req.ip,
            contentLength: res.get('Content-Length') || 0,
        };

        const logMsg = `[${req.method}] ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`;
        
        if (res.statusCode >= 500) {
            Logger.error(logMsg, meta);
        } else if (res.statusCode >= 400) {
            Logger.warn(logMsg, meta);
        } else {
            Logger.http(logMsg, meta);
        }
    });
    
    next();
});

// Routes
app.use('/api/v1', routes);

// 404 Handler for unmatched routes
app.use((req, res, next) => {
    next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
});

// Global Error Handler
app.use(errorHandler);

export default app;
