
import crypto from 'crypto';

export const generateApiKey = (): { key: string; hash: string } => {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const key = `ak_${randomBytes}`;
    const hash = hashApiKey(key);
    return { key, hash };
};

export const hashApiKey = (key: string): string => {
    return crypto.createHash('sha256').update(key).digest('hex');
};
