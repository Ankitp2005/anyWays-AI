import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { checkRateLimit, rateLimitHeaders, RateLimitResult } from './rateLimit.ts';
import { logRequest, extractRequestMeta, RequestLog } from './logger.ts';

/**
 * API Key Authentication + Rate Limiting + Logging
 * ─────────────────────────────────────────────────
 * Single entry point for all API-key-authenticated Edge Functions.
 *
 * Pipeline:
 *   1. Extract x-api-key header
 *   2. SHA-256 hash → lookup in api_keys table
 *   3. Check revocation
 *   4. Rate limit check (100 req / 60s per key)
 *   5. Return validated payload + rate limit metadata
 *   6. Log the request (fire-and-forget, non-blocking)
 */

// ── Hashing ──────────────────────────────────────────────────────────────────

export async function hashApiKey(apiKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey));
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

// ── Validation Result ────────────────────────────────────────────────────────

// ── Validation Result ────────────────────────────────────────────────────────

export interface ApiKeyValidation {
    userId:    string;
    apiKeyId:  string;
    rateLimit: { 
        remaining: number; 
        limit:     number;
    };
    supabase:  SupabaseClient;  // service-role client for downstream use
}

// ── Global Service Client Initialization ─────────────────────────────────────
// Initialized once per Edge Function cold start to maximize connection reuse
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const globalSupabase = supabaseUrl && supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey) 
    : null;

// ── Main Validation Function ─────────────────────────────────────────────────

export async function validateApiKey(
    req: Request,
    endpoint: string = 'api/v1',
): Promise<ApiKeyValidation> {
    const startTime = Date.now();
    const meta      = extractRequestMeta(req);

    // 1. Extract API Key from headers
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
        throw new Error('API Key is missing');
    }

    // 2. Validate key (existing logic)
    const keyHash = await hashApiKey(apiKey);
    if (!globalSupabase) throw new Error('Missing Supabase environment variables');
    const supabase = globalSupabase;

    const { data: keyData, error } = await supabase
        .from('api_keys')
        .select('id, user_id, revoked_at')
        .eq('key_hash', keyHash)
        .single();

    if (error || !keyData) {
        throw new Error('Invalid API Key');
    }

    if (keyData.revoked_at !== null) {
        throw new Error('API Key has been revoked');
    }

    // 3. Call rateLimiter.allow(apiKeyId, endpoint)
    // Using checkRateLimit as the entry point to the PostgresTokenBucket
    const rateLimitResult = await checkRateLimit(supabase, keyData.id, undefined, endpoint);

    // 4. If not allowed → throw RateLimitError
    if (!rateLimitResult.allowed) {
        throw new RateLimitError(rateLimitResult);
    }

    // Log the request (fire-and-forget)
    logRequest(supabase, {
        apiKeyId:   keyData.id,
        userId:     keyData.user_id,
        endpoint:   endpoint,
        method:     meta.method,
        statusCode: 200,
        durationMs: Date.now() - startTime,
        userAgent:  meta.userAgent,
        ip:         meta.ip,
    });

    // Return specific shape requested
    return {
        userId:    keyData.user_id,
        apiKeyId:  keyData.id,
        rateLimit: {
            remaining: rateLimitResult.remaining,
            limit:     rateLimitResult.limit
        },
        supabase, // Included for functional continuity in the Edge Function
    };
}

// ── Custom Error for Rate Limiting ───────────────────────────────────────────

export class RateLimitError extends Error {
    rateLimit: RateLimitResult;

    constructor(rateLimit: RateLimitResult) {
        super('Rate limit exceeded. Please slow down.');
        this.name      = 'RateLimitError';
        this.rateLimit = rateLimit;
    }
}

// ── Helper: Build rate-limited error response ────────────────────────────────

export function rateLimitedResponse(err: RateLimitError, corsHeaders: Record<string, string>): Response {
    return new Response(
        JSON.stringify({
            success: false,
            error:   err.message,
            retryAfter: err.rateLimit.resetAt,
        }),
        {
            status: 429,
            headers: {
                ...corsHeaders,
                ...rateLimitHeaders(err.rateLimit),
                'Content-Type': 'application/json',
                'Retry-After':  '60',
            },
        },
    );
}
