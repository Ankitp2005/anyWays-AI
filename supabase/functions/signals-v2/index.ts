export const config = {
    verify_jwt: false
};
import { validateApiKey, RateLimitError } from '../shared/apiKeyUtils.ts';
import { rateLimitHeaders } from '../shared/rateLimit.ts';
import { corsHeaders } from '../shared/cors.ts';
import { calculateConfidenceScore, getScoreLabel, Signal, isDuplicateSignal } from '../shared/scoring.ts';
import { getSignalImpact } from '../shared/scoringWeights.ts';
import { successResponse, errorResponse, assertRequired, assertOneOf, ApiError } from '../shared/apiResponse.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

/**
 * Edge Function: /signals
 * [v1.0.1: Added x-environment to CORS whitelist]
 *
 * Mirrors Express route:
 *   POST /signals   → ingest a validation signal for a place
 *                     recalculates + persists the place's confidence_score
 *
 * Auth: x-api-key header ONLY (this is an SDK-facing endpoint, not dashboard)
 *
 * Request body:
 *   {
 *     place_id:          string  (UUID)
 *     signal_type:       'FOOT_TRAFFIC' | 'OCR_MENU' | 'SOCIAL_SENTIMENT' | 'HOURS_VERIFIED' | 'PHONE_VERIFIED'
 *     signal_value:      object  (arbitrary JSONB — shape varies per signal_type)
 *     confidence_impact: number  (positive or negative integer)
 *   }
 *
 * Response: { success: true, newScore: number, place: PlaceRow }
 */
// ── Global Client Initialization ─────────────────────────────────────────────
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const globalSupabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

import { logRequest, extractRequestMeta } from '../shared/logger.ts';
import { withSentry, trackSpan } from '../shared/sentry.ts';
import * as Sentry from 'https://esm.sh/@sentry/deno@8.0.0';

Deno.serve(withSentry(async (req: Request) => {
    const startTime = performance.now();
    const { endpoint, method, userAgent, ip } = extractRequestMeta(req);
    const traceId = req.headers.get('x-trace-id') || 'unknown';
    const correlationId = req.headers.get('x-correlation-id') || 'unknown';
    
    let statusCode = 200;
    let apiKeyId = 'unknown';
    let userId = 'unknown';

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    // ── Simulation Isolation ─────────────────────────────────────────────────
    const isSimulated = req.headers.get('x-simulation') === 'true';
    Sentry.setTag("is_simulated", isSimulated.toString());

    if (isSimulated && Deno.env.get('ENVIRONMENT') === 'production') {
        Sentry.setTag("security_violation", "SIMULATION_IN_PRODUCTION");
        throw new ApiError('SIMULATION_BLOCKED', 'Simulation disabled in production', 403);
    }

    try {
        if (req.method !== 'POST') {
            throw new ApiError('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
        }

        if (!globalSupabase) {
            throw new ApiError('INTERNAL_ERROR', 'Missing Supabase environment variables', 500);
        }

        // ── Input Sanitization & Validation ──────────────────────────────────
        import { validateRequestSize, sanitizeObject, validateUUID } from '../shared/sanitization.ts';
        await validateRequestSize(req);

        const body = await req.json().catch(() => { throw new ApiError('VALIDATION_FAILED', 'Invalid JSON payload', 400); });
        
        // Sanitize IDs and Objects
        const { place_id, signal_type } = body;
        let { signal_value } = body;

        assertRequired(place_id, 'place_id');
        validateUUID(place_id, 'place_id');
        assertRequired(signal_value, 'signal_value');
        
        // Deep sanitize signal_value to prevent XSS in analytics/UI
        signal_value = sanitizeObject(signal_value);

        Sentry.setTag("place_id", place_id);
        Sentry.setTag("signal_type", signal_type);

        // ── Auth + Rate Limit ────────────────────────────────────────────────
        const auth = await trackSpan('Auth Verification', 'auth.verify', {}, async () => {
            return await validateApiKey(req, 'signals/ingest');
        });
        
        apiKeyId = auth.apiKeyId;
        userId = auth.userId;
        const { rateLimit, supabase } = auth;

        // ── GPS Validation (Haversine Distance) ──────────────────────────────
        const GPS_SIGNALS = ['GPS_ARRIVAL_VERIFIED', 'REAL_DWELL_TIME', 'DEVICE_VERIFIED_PRESENCE'];
        if (GPS_SIGNALS.includes(signal_type)) {
            await trackSpan('GPS Validation', 'intelligence.gps', { place_id }, async () => {
                const { lat, lng, device_id, source_type } = signal_value;
                assertRequired(lat, 'signal_value.lat');
                assertRequired(lng, 'signal_value.lng');

                const { data: placeData } = await globalSupabase
                    .from('places')
                    .select('latitude, longitude')
                    .eq('id', place_id)
                    .single();
                    
                if (!placeData || placeData.latitude == null || placeData.longitude == null) {
                    throw new ApiError('VALIDATION_FAILED', 'Target place has no coordinates for distance validation', 400);
                }

                const R = 6371e3;
                const dLat = (lat - placeData.latitude) * Math.PI / 180;
                const dLon = (lng - placeData.longitude) * Math.PI / 180;
                const a = 
                    Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(placeData.latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
                    Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
                const distance = R * c;

                if (distance > 200) {
                    await globalSupabase.rpc('increment_api_trust', { p_api_key: apiKeyId, p_rejected: true });
                    throw new ApiError('VALIDATION_FAILED', `Device is too far from location (${Math.round(distance)}m > 200m)`, 400);
                }
            });
        }

        // ── 4. Trust Score & Final Calculation ───────────────────────────────
        const { data: trustScore } = await trackSpan('Trust Calculation', 'intelligence.trust', { apiKeyId }, async () => {
            return await globalSupabase.rpc('increment_api_trust', { p_api_key: apiKeyId, p_rejected: false });
        });
        const api_key_trust = trustScore ?? 1.0;
        Sentry.setTag("api_key_trust", api_key_trust.toString());

        // ── 7. Final Delta Calculation ───────────────────────────────────────
        const finalImpact = await trackSpan('Scoring Logic', 'intelligence.scoring', { signal_type }, async () => {
            // Recency
            const detectedAt = signal_value.detected_at ? new Date(signal_value.detected_at) : new Date();
            const ageHours = (Date.now() - detectedAt.getTime()) / (1000 * 60 * 60);
            let recency_factor = 1.0;
            if (ageHours > 6) recency_factor = 0.4;
            else if (ageHours >= 1) recency_factor = 0.7;

            // Repeat
            const { count: repeatCount } = await globalSupabase
                .from('validation_signals')
                .select('*', { count: 'exact', head: true })
                .eq('place_id', place_id)
                .eq('signal_type', signal_type)
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
            const repeatMultiplier = 1.0 / (1 + (repeatCount || 0));

            // Weights
            const { data: weightData } = await globalSupabase
                .from('signal_weights')
                .select('base_weight, reliability_score')
                .eq('signal_type', signal_type)
                .single();
            const base_weight = weightData?.base_weight || getSignalImpact(signal_type, signal_value);
            const reliability_score = weightData?.reliability_score || 0.8;

            return base_weight * reliability_score * Math.pow(api_key_trust, 2) * recency_factor * repeatMultiplier;
        });

        // ── 3. Persist via RPC ────────────────────────────────────────────────
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const safeApiKeyId = UUID_REGEX.test(apiKeyId) ? apiKeyId : null;

        const { data: updatedPlace, error: rpcError } = await trackSpan('Persistence RPC', 'db.rpc', { rpc: 'ingest_signal' }, async () => {
            return await globalSupabase.rpc('ingest_signal', {
                p_place_id:          place_id,
                p_signal_type:       signal_type,
                p_signal_value:      signal_value,
                p_confidence_impact: Math.round(finalImpact),
                p_user_id:           userId,
                p_api_key_id:        safeApiKeyId
            });
        });

        if (rpcError) {
            Sentry.setTag("error_category", "DATABASE_RPC_FAILURE");
            throw new Error(rpcError.message);
        }

        statusCode = 201;
        return successResponse({
            newScore:   updatedPlace.confidence_score,
            scoreLabel: getScoreLabel(updatedPlace.confidence_score),
            place:      updatedPlace,
        }, 201, {}, undefined, rateLimit);

    } catch (err: any) {
        statusCode = err.status || 500;
        if (statusCode >= 500) {
            Sentry.captureException(err);
        }
        return errorResponse(err);
    } finally {
        const durationMs = Math.round(performance.now() - startTime);
        if (globalSupabase) {
            logRequest(globalSupabase, {
                apiKeyId,
                userId,
                endpoint,
                method,
                statusCode,
                durationMs,
                userAgent,
                ip,
                traceId,
                correlationId
            });
        }
    }
}));
