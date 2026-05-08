import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { PostgresTokenBucket } from './rate_limiter.ts';

/**
 * Rate Limiter for O(1) Distributed Performance
 */

export interface RateLimitConfig {
    maxRequests:   number;   // bucket capacity
    windowSeconds: number;   // refill window
}

export interface RateLimitResult {
    allowed:    boolean;
    remaining:  number;
    limit:      number;
    resetAt:    string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
    maxRequests:   60,       // 60 requests
    windowSeconds: 60,       // per minute (1 req/sec average)
};

/**
 * checkRateLimit
 */
export async function checkRateLimit(
    supabase:  SupabaseClient,
    identifier: string,
    config:    RateLimitConfig = DEFAULT_CONFIG,
    path:      string = 'global'
): Promise<RateLimitResult> {
    const limiter = new PostgresTokenBucket(supabase, {
        capacity: config.maxRequests,
        refill_rate_per_sec: config.maxRequests / config.windowSeconds
    });

    return await limiter.allow(identifier, path);
}

/**
 * Middleware: withRateLimit
 * 
 * Protects an Edge Function handler with distributed rate limiting.
 * Uses the client's IP address or API Key as the identifier.
 */
export const withRateLimit = (
    handler: (req: Request) => Promise<Response>,
    config: RateLimitConfig = DEFAULT_CONFIG
) => {
    return async (req: Request) => {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = (globalThis as any).supabase || (supabaseUrl && supabaseKey ? (globalThis as any).supabase = (await import('https://esm.sh/@supabase/supabase-js@2.38.0')).createClient(supabaseUrl, supabaseKey) : null);

        if (!supabase) return await handler(req);

        // Identifier: API Key (if present) OR IP Address
        const apiKey = req.headers.get('x-api-key');
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
        const identifier = apiKey || ip;
        const path = new URL(req.url).pathname;

        const result = await checkRateLimit(supabase, identifier, config, path);

        if (!result.allowed) {
            return new Response(JSON.stringify({
                error: "Rate limit exceeded. Try again in " + Math.ceil((new Date(result.resetAt).getTime() - Date.now()) / 1000) + " seconds."
            }), {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    ...rateLimitHeaders(result)
                }
            });
        }

        const response = await handler(req);
        const finalHeaders = new Headers(response.headers);
        Object.entries(rateLimitHeaders(result)).forEach(([k, v]) => finalHeaders.set(k, v));

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: finalHeaders
        });
    };
};

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
        'X-RateLimit-Limit':     String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset':     result.resetAt,
    };
}
