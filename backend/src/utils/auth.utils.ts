
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../config';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
    plain: string,
    hashed: string
): Promise<boolean> => {
    return bcrypt.compare(plain, hashed);
};

export const generateAccessToken = (payload: object): string => {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '15m' });
};

export const generateRefreshToken = (payload: object): string => {
    return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string): any => {
    try {
        return jwt.verify(token, config.jwtSecret);
    } catch (error) {
        return null;
    }
};

export const verifyRefreshToken = (token: string): any => {
    try {
        return jwt.verify(token, config.jwtRefreshSecret);
    } catch (error) {
        return null;
    }
};
