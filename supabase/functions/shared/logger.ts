import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

/**
 * Structured Request Logger
 * ─────────────────────────
 * Writes structured log entries to api_key_usage and console.
 *
 * Two log targets:
 *   1. api_key_usage table — persistent, queryable from dashboard
 *   2. console.log — visible in Supabase Dashboard → Functions → Logs
 *
 * Fire-and-forget: logging never blocks the response.
 */

export interface RequestLog {
    apiKeyId:     string;
    userId:       string;
    endpoint:     string;
    method:       string;
    statusCode:   number;
    durationMs:   number;
    userAgent?:   string;
    ip?:          string;
    error?:       string;
    traceId?:     string;
    correlationId?: string;
}

/**
 * logRequest
 *
 * Writes a structured log to both the DB and console.
 * Non-blocking — errors are caught and logged, never thrown.
 *
 * @param supabase   Service-role client
 * @param log        Structured log data
 */
export async function logRequest(
    supabase: SupabaseClient,
    log:      RequestLog,
): Promise<void> {
    // 1. Structured console log (visible in Supabase Functions → Logs)
    const logLine = {
        ts:        new Date().toISOString(),
        key:       log.apiKeyId.slice(0, 8) + '…',   // truncated for safety
        user:      log.userId.slice(0, 8) + '…',
        endpoint:  log.endpoint,
        method:    log.method,
        status:    log.statusCode,
        duration:  `${log.durationMs}ms`,
        trace_id:  log.traceId,
        correlation_id: log.correlationId,
        ...(log.error ? { error: log.error } : {}),
    };
    console.log('[RequestLog]', JSON.stringify(logLine));

    // 2. Persist to DB tables (fire-and-forget)
    try {
        const now = new Date().toISOString();
        await Promise.all([
            // Target 1: Insert detailed usage row (Audit Log)
            supabase.from('api_key_usage').insert({
                api_key_id:  log.apiKeyId,
                endpoint:    log.endpoint,
                method:      log.method,
                status_code: log.statusCode,
                metadata: {
                    trace_id: log.traceId,
                    correlation_id: log.correlationId,
                    user_agent: log.userAgent,
                    ip_address: log.ip
                }
            }),
            // ... (rest of the functions remain the same)

            // Target 2: Update aggregated metrics (Dashboard Stats)
            // Using an atomic PostgreSQL RPC for high-concurrency safety.
            supabase.rpc('increment_api_metric', { 
                p_key_id:   log.apiKeyId, 
                p_endpoint: log.endpoint 
            }),

            // Target 3: Update last_used_at on the key
            supabase.from('api_keys')
                .update({ last_used_at: now })
                .eq('id', log.apiKeyId),
        ]);
    } catch (err: any) {
        console.error('[RequestLog] DB write failed:', err.message);
    }
}

/**
 * extractRequestMeta
 *
 * Extracts useful metadata from the incoming request for logging.
 */
export function extractRequestMeta(req: Request): {
    endpoint:  string;
    method:    string;
    userAgent: string;
    ip:        string;
} {
    return {
        endpoint:  new URL(req.url).pathname,
        method:    req.method,
        userAgent: req.headers.get('user-agent') ?? 'unknown',
        ip:        req.headers.get('x-forwarded-for')
                     ?? req.headers.get('cf-connecting-ip')
                     ?? 'unknown',
    };
}
