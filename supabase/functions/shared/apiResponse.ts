import { corsHeaders } from './cors.ts';

/**
 * Standardized API Response Format
 * ────────────────────────────────
 * This module enforces a strict, predictable contract for all API responses.
 * External developers relying on SDKs/Webhooks need consistent error codes
 * and data shapes.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
    success: true;
    data:    T;
    meta?:   Record<string, any>;
}

export interface ApiErrorResponse {
    success: false;
    error: {
        code:     ErrorCode;
        message:  string;
        details?: Record<string, any>;
    };
}

export type ErrorCode =
    | 'UNAUTHORIZED'         // 401: Missing or invalid API key / JWT
    | 'RATE_LIMIT_EXCEEDED'  // 429: Too many requests
    | 'VALIDATION_FAILED'    // 422: Missing fields, wrong types
    | 'NOT_FOUND'            // 404: Resource doesn't exist or not owned
    | 'CONFLICT'             // 409: Resource already exists / state conflict
    | 'INTERNAL_ERROR'       // 500: Uncaught exception
    | 'METHOD_NOT_ALLOWED';  // 405: HTTP method not supported

// ── Success Formatter ────────────────────────────────────────────────────────

/**
 * Returns a standardized 2xx response.
 */
export function successResponse<T>(
    data: T,
    status: number = 200,
    extraHeaders: Record<string, string> = {},
    meta?: Record<string, any>,
    rateLimit?: { remaining: number; limit: number }
): Response {
    const body: ApiSuccessResponse<T> = { success: true, data };
    if (meta) body.meta = meta;

    const headers: Record<string, string> = {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...extraHeaders,
    };

    if (rateLimit) {
        headers['X-RateLimit-Limit']     = String(rateLimit.limit);
        headers['X-RateLimit-Remaining'] = String(rateLimit.remaining);
    }

    return new Response(JSON.stringify(body), {
        status,
        headers,
    });
}

// ── Error Classes & Formatter ────────────────────────────────────────────────

/**
 * Custom Error class that carries an ErrorCode and optional details.
 * Throw this inside your edge function logic, and catch it at the top level.
 */
export class ApiError extends Error {
    public code: ErrorCode;
    public status: number;
    public details?: Record<string, any>;

    constructor(code: ErrorCode, message: string, status: number, details?: Record<string, any>) {
        super(message);
        this.name    = 'ApiError';
        this.code    = code;
        this.status  = status;
        this.details = details;
    }
}

/**
 * Returns a standardized 4xx/5xx response.
 * Safely handles unexpected non-ApiError exceptions.
 */
export function errorResponse(
    err: unknown,
    extraHeaders: Record<string, string> = {}
): Response {
    let code: ErrorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let status = 500;
    let details: Record<string, any> | undefined;

    if (err instanceof ApiError) {
        code    = err.code;
        message = err.message;
        status  = err.status;
        details = err.details;
    } else if (err && typeof err === 'object' && 'rateLimit' in err) {
        // Special handling for RateLimitError without explicit import to avoid circularity
        const rl = (err as any).rateLimit;
        code = 'RATE_LIMIT_EXCEEDED';
        status = 429;
        message = (err as Error).message || 'Rate limit exceeded';
        
        extraHeaders = {
            ...extraHeaders,
            'X-RateLimit-Limit':     String(rl.limit || 0),
            'X-RateLimit-Remaining': String(rl.remaining || 0),
            'X-RateLimit-Reset':     String(rl.resetAt || ''),
            'Retry-After':           '60'
        };
    } else if (err instanceof Error) {
        // In production, obfuscate generic error messages to prevent leakage
        const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
        message = isProduction ? 'An internal system error occurred' : err.message;
        
        // Try to map common generic errors to standard codes
        if (err.message.includes('Unauthorized') || err.message.includes('Invalid API Key')) {
            code = 'UNAUTHORIZED';
            status = 401;
            message = err.message; // Re-allow these specific auth messages
        } else if (err.message.includes('JSON')) {
            code = 'VALIDATION_FAILED';
            message = 'Invalid JSON payload';
            status = 400;
        }
    }

    const body: ApiErrorResponse = {
        success: false,
        error: { code, message, details }
    };

    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            ...extraHeaders,
        },
    });
}

// ── Validation Helpers ───────────────────────────────────────────────────────

/**
 * Asserts that a value is present, throws VALIDATION_FAILED if not.
 */
export function assertRequired(value: any, fieldName: string): asserts value {
    if (value === undefined || value === null || value === '') {
        throw new ApiError('VALIDATION_FAILED', `Field '${fieldName}' is required`, 422, { field: fieldName });
    }
}

/**
 * Asserts that a value exists in an allowed array.
 */
export function assertOneOf<T>(value: any, allowedValues: readonly T[], fieldName: string): asserts value is T {
    if (!allowedValues.includes(value)) {
        throw new ApiError('VALIDATION_FAILED', `Field '${fieldName}' must be one of: ${allowedValues.join(', ')}`, 422, {
            field: fieldName,
            allowed: allowedValues
        });
    }
}
