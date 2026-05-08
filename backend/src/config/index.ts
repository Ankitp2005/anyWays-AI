import dotenv from 'dotenv';
dotenv.config();

export const config = {

    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
};
