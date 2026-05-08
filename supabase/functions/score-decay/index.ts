/**
 * Edge Function: score-decay
 * ──────────────────────────
 * Scheduled function that applies confidence score decay to stale places.
 *
 * Trigger:  Supabase Cron (every hour) or manual HTTP POST
 * Auth:     Service role only (no user JWT required)
 * Safety:   Idempotent — safe to run multiple times per hour
 *
 * Flow:
 *   1. Calls the `run_score_decay()` SQL function
 *   2. Returns a summary of affected places
 */

export const config = {
    // This is a system-level cron function, no JWT verification needed.
    // It runs with the service role key.
    verify_jwt: false
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req: Request) => {
    // Only allow POST (cron trigger) and OPTIONS (CORS preflight)
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        });
    }

    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Optional: Verify a shared secret for manual triggers
    // (Supabase cron calls don't need this, but external callers should authenticate)
    const authHeader = req.headers.get('authorization');
    const expectedBearer = `Bearer ${supabaseServiceKey}`;

    // Allow calls from Supabase internal cron (no auth header) or with service key
    if (authHeader && authHeader !== expectedBearer) {
        return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(
            JSON.stringify({ error: 'Missing Supabase environment variables' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase.rpc('run_score_decay');

        if (error) {
            console.error('[score-decay] RPC error:', error.message);
            return new Response(
                JSON.stringify({ success: false, error: error.message }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const decayedCount = data?.decayed_count ?? 0;
        console.log(`[score-decay] Completed: ${decayedCount} places decayed.`);

        return new Response(
            JSON.stringify({
                success: true,
                message: `Score decay applied to ${decayedCount} place(s)`,
                result: data
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (err: any) {
        console.error('[score-decay] Unhandled error:', err);
        return new Response(
            JSON.stringify({ success: false, error: err.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});
