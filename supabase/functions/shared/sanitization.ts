/**
 * Sanitization & Body Validation Helpers
 * ──────────────────────────────────────
 */
import { ApiError } from './apiResponse.ts';

const MAX_BODY_SIZE = 100 * 1024; // 100KB limit for most ingest payloads
const HTML_TAG_REGEX = /<[^>]*>/g;

/**
 * Validates the request body size to prevent DoS attacks via large payloads.
 */
export async function validateRequestSize(req: Request, maxSize: number = MAX_BODY_SIZE): Promise<void> {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > maxSize) {
        throw new ApiError('VALIDATION_FAILED', `Payload too large (limit: ${maxSize / 1024}KB)`, 413);
    }
}

/**
 * Sanitizes a string by removing HTML tags and trimming whitespace.
 */
export function sanitizeString(val: any, fieldName: string): string {
    if (typeof val !== 'string') {
        throw new ApiError('VALIDATION_FAILED', `Field '${fieldName}' must be a string`, 422, { field: fieldName });
    }
    
    // Basic XSS prevention: remove HTML tags
    const sanitized = val.replace(HTML_TAG_REGEX, '').trim();
    
    if (sanitized.length === 0) {
        throw new ApiError('VALIDATION_FAILED', `Field '${fieldName}' cannot be empty after sanitization`, 422, { field: fieldName });
    }
    
    return sanitized;
}

/**
 * Recursively sanitizes an object's string properties.
 */
export function sanitizeObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = value.replace(HTML_TAG_REGEX, '').trim();
        } else if (typeof value === 'object') {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

/**
 * Validates basic UUID format.
 */
export function validateUUID(uuid: string, fieldName: string): void {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(uuid)) {
        throw new ApiError('VALIDATION_FAILED', `Field '${fieldName}' must be a valid UUID`, 422, { field: fieldName });
    }
}
