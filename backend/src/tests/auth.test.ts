
import {
    hashPassword,
    comparePassword,
    generateAccessToken,
    verifyAccessToken,
} from '../utils/auth.utils';

describe('Auth Utils', () => {
    describe('Password Hashing', () => {
        it('should hash a password correctly', async () => {
            const password = 'password123';
            const hash = await hashPassword(password);
            expect(hash).not.toBe(password);
            expect(hash).toHaveLength(60); // bcrypt hash length
        });

        it('should compare password and hash correctly', async () => {
            const password = 'password123';
            const hash = await hashPassword(password);
            const isMatch = await comparePassword(password, hash);
            expect(isMatch).toBe(true);
        });

        it('should return false for incorrect password', async () => {
            const password = 'password123';
            const hash = await hashPassword(password);
            const isMatch = await comparePassword('wrongpassword', hash);
            expect(isMatch).toBe(false);
        });
    });

    describe('JWT Tokens', () => {
        it('should generate and verify access token', () => {
            const payload = { userId: '123', email: 'test@example.com' };
            const token = generateAccessToken(payload);
            expect(typeof token).toBe('string');

            const decoded = verifyAccessToken(token);
            expect(decoded).toMatchObject(payload);
        });

        it('should return null for invalid token', () => {
            const result = verifyAccessToken('invalid.token.here');
            expect(result).toBeNull();
        });
    });
});
