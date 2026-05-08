import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { validateApiKey, RateLimitError } from '../shared/apiKeyUtils.ts';
import { rateLimitHeaders } from '../shared/rateLimit.ts';
import { corsHeaders } from '../shared/cors.ts';
import { scoreLabel } from '../shared/scoring.ts';
import { successResponse, errorResponse, assertRequired, ApiError } from '../shared/apiResponse.ts';

/**
 * Edge Function: /places
 * [v1.0.1: Added x-environment to CORS whitelist]
 *
 * Mirrors Express routes:
 *   GET    /places              → list all places for the authenticated user
 *   GET    /places?id=:id       → single place with its validation_signals
 *   GET    /places?id=:id&signals=true → alias for above
 *   POST   /places              → create a new place
 *   PUT    /places?id=:id       → update a place (name, address, status, lat/lng)
 *   DELETE /places?id=:id       → delete a place (cascades signals via FK)
 *
 * Auth: x-api-key header (SDK / robot) OR Authorization: Bearer <JWT> (dashboard)
 * Response shape: { success: boolean, data?: any, error?: string }
 */
// ── Global Client Initialization ─────────────────────────────────────────────
// Initialized once per Edge Function isolate to maximize connection reuse
const supabaseUrl        = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAnonKey    = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const globalSupabase = supabaseUrl && supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey) 
    : null;
const globalAnonClient = supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

import { withSentry, trackSpan } from '../shared/sentry.ts';
import * as Sentry from 'https://esm.sh/@sentry/deno@8.0.0';

Deno.serve(withSentry(async (req: Request) => {
    const startTime = performance.now();
    const { endpoint, method, userAgent, ip } = extractRequestMeta(req);
    let statusCode = 200;
    let apiKeyId = 'unknown';
    let userId = 'unknown';

    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (!globalSupabase || !globalAnonClient) {
            throw new ApiError('INTERNAL_ERROR', 'Missing Supabase environment variables', 500);
        }

        // ── Input Sanitization & Validation ──────────────────────────────────
        import { validateRequestSize, sanitizeString, validateUUID, sanitizeObject } from '../shared/sanitization.ts';
        await validateRequestSize(req);

        // ── Auth ────────────────────────────────────────────────────────────
        const authHeader = req.headers.get('Authorization');
        const apiKeyHeader = req.headers.get('x-api-key');

        let rateLimit: { remaining: number; limit: number } | undefined;

        if (apiKeyHeader) {
            const result = await trackSpan('Auth Verification', 'auth.verify', {}, async () => {
                return await validateApiKey(req, 'places');
            });
            userId = result.userId;
            apiKeyId = result.apiKeyId;
            rateLimit = result.rateLimit;
        } else if (authHeader?.startsWith('Bearer ')) {
            const jwt = authHeader.replace('Bearer ', '');
            const { data: { user }, error } = await globalAnonClient.auth.getUser(jwt);
            if (error || !user) throw new ApiError('UNAUTHORIZED', 'Unauthorized: Invalid JWT', 401);
            userId = user.id;
            apiKeyId = 'dashboard-jwt'; // Tag dashboard usage
        } else {
            throw new ApiError('UNAUTHORIZED', 'Unauthorized: provide x-api-key or Authorization header', 401);
        }

        const supabase = globalSupabase;
        const url      = new URL(req.url);
        const placeId  = url.searchParams.get('id');

        // ── GET ─────────────────────────────────────────────────────────────
        if (req.method === 'GET') {
            const validateMatch = url.pathname.match(/\/([^\/]+)\/validate\/?$/);

            // Collapse-aware derived status
            const getDerivedStatus = (prob: number, collapseVerdict: any) => {
                if (collapseVerdict?.collapse_reason === 'partial_evidence_uncertain') return "UNCERTAIN";
                if (prob < 0.2) return "LIKELY_CLOSED";
                if (prob < 0.5) return "UNCERTAIN";
                return "LIKELY_OPEN";
            };

            // Helper: fetch collapse eligibility for a place
            const getCollapseVerdict = async (targetPlaceId: string) => {
                const { data } = await trackSpan('Collapse Check', 'intelligence.collapse', { targetPlaceId }, async () => {
                    return await supabase.rpc('evaluate_collapse_eligibility', { p_place_id: targetPlaceId });
                });
                return data || { collapse_allowed: false, collapse_reason: 'unknown', signal_consensus_score: 0 };
            };

            if (validateMatch) {
                const targetId = validateMatch[1];
                const { data: place, error: placeError } = await trackSpan('Fetch Place Info', 'db.select', { targetId }, async () => {
                    return await supabase
                        .from('places')
                        .select('confidence_score, last_validated_at, validation_signals(signal_type)')
                        .eq('id', targetId)
                        .eq('user_id', userId)
                        .single();
                });

                if (placeError || !place) {
                    throw new ApiError('NOT_FOUND', 'Place not found or unauthorized', 404);
                }

                const signals = place.validation_signals || [];
                const signalSummary = signals.reduce((acc: Record<string, number>, sig: any) => {
                    acc[sig.signal_type] = (acc[sig.signal_type] || 0) + 1;
                    return acc;
                }, {});

                const { data: calibData } = await supabase.rpc('get_score_calibration_details', { p_score: place.confidence_score });
                const prob = calibData?.success_probability ?? (place.confidence_score / 100);
                const { data: decision } = await supabase.rpc('get_business_decision', { p_success_probability: prob });
                const collapseVerdict = await getCollapseVerdict(targetId);

                return successResponse({
                    status: scoreLabel(place.confidence_score),
                    predicted_score: place.confidence_score,
                    success_probability: prob,
                    derived_status: getDerivedStatus(prob, collapseVerdict),
                    collapse_allowed: collapseVerdict.collapse_allowed,
                    collapse_reason: collapseVerdict.collapse_reason,
                    signal_consensus_score: collapseVerdict.signal_consensus_score,
                    expected_value: decision?.expected_value ?? 0,
                    recommended_action: decision?.recommended_action ?? 'RETRY',
                    reasoning: decision?.reasoning ?? '',
                    confidence_interval: calibData?.confidence_interval ?? [0, 1],
                    sample_size: calibData?.sample_size ?? 0,
                    reliability: calibData?.reliability ?? 'LOW',
                    lastVerified: place.last_validated_at,
                    totalSignals: signals.length,
                    signalSummary
                }, 200, {}, undefined, rateLimit);
            }

            if (placeId) {
                const { data, error } = await trackSpan('Fetch Single Place', 'db.select', { placeId }, async () => {
                    return await supabase
                        .from('places')
                        .select('*, validation_signals(*)')
                        .eq('id', placeId)
                        .eq('user_id', userId)
                        .single();
                });

                if (error) throw new ApiError('NOT_FOUND', `Place not found or unauthorized`, 404);

                const { data: calibData } = await supabase.rpc('get_score_calibration_details', { p_score: data.confidence_score });
                const prob = calibData?.success_probability ?? (data.confidence_score / 100);
                const { data: decision } = await supabase.rpc('get_business_decision', { p_success_probability: prob });
                const collapseVerdict = await getCollapseVerdict(placeId);

                const derivedStatus = getDerivedStatus(prob, collapseVerdict);

                return successResponse({
                    ...data,
                    success_probability: prob,
                    derived_status: derivedStatus,
                    collapse_allowed: collapseVerdict.collapse_allowed,
                    collapse_reason: collapseVerdict.collapse_reason,
                    signal_consensus_score: collapseVerdict.signal_consensus_score,
                    expected_value: decision?.expected_value ?? 0,
                    recommended_action: decision?.recommended_action ?? 'RETRY',
                    reasoning: decision?.reasoning ?? '',
                    confidence_interval: calibData?.confidence_interval ?? [0, 1],
                    sample_size: calibData?.sample_size ?? 0,
                    reliability: calibData?.reliability ?? 'LOW'
                }, 200, {}, undefined, rateLimit);
            }

            const { data, error } = await trackSpan('List Places', 'db.select', {}, async () => {
                return await supabase
                    .from('places')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });
            });

            if (error) throw new Error(error.message);

            const enhancedData = data.map(p => {
                const prob = p.confidence_score / 100;
                return { ...p, derived_status: getDerivedStatus(prob, null) };
            });

            return successResponse(enhancedData, 200, {}, undefined, rateLimit);
        }

        // ── POST ─────────────────────────────────────────────────────────────
        if (req.method === 'POST') {
            const rawBody = await req.json().catch(() => { throw new ApiError('VALIDATION_FAILED', 'Invalid JSON payload', 400) });
            
            const body = {
                name:      sanitizeString(rawBody.name, 'name'),
                address:   rawBody.address ? sanitizeString(rawBody.address, 'address') : null,
                latitude:  rawBody.latitude  ?? null,
                longitude: rawBody.longitude ?? null,
                status:    rawBody.status    ?? 'OPEN',
            };

            const { data, error } = await trackSpan('Create Place', 'db.insert', {}, async () => {
                return await supabase
                    .from('places')
                    .insert([{
                        user_id:   userId,
                        ...body
                    }])
                    .select()
                    .single();
            });

            if (error) throw new Error(error.message);
            return successResponse(data, 201, {}, undefined, rateLimit);
        }

        // ── PUT ──────────────────────────────────────────────────────────────
        if (req.method === 'PUT') {
            assertRequired(placeId, 'id');
            validateUUID(placeId, 'id');
            const rawBody = await req.json().catch(() => { throw new ApiError('VALIDATION_FAILED', 'Invalid JSON payload', 400) });

            const body: any = {};
            if (rawBody.name) body.name = sanitizeString(rawBody.name, 'name');
            if (rawBody.address) body.address = sanitizeString(rawBody.address, 'address');
            if (rawBody.latitude !== undefined) body.latitude = rawBody.latitude;
            if (rawBody.longitude !== undefined) body.longitude = rawBody.longitude;
            if (rawBody.status) body.status = rawBody.status;

            const { data, error } = await trackSpan('Update Place', 'db.update', { placeId }, async () => {
                return await supabase
                    .from('places')
                    .update(body)
                    .eq('id', placeId)
                    .eq('user_id', userId)
                    .select()
                    .single();
            });

            if (error) throw new ApiError('NOT_FOUND', 'Place not found or unauthorized', 404);
            return successResponse(data, 200, {}, undefined, rateLimit);
        }

        // ── DELETE ────────────────────────────────────────────────────────────
        if (req.method === 'DELETE') {
            assertRequired(placeId, 'id');
            const { error } = await trackSpan('Delete Place', 'db.delete', { placeId }, async () => {
                return await supabase
                    .from('places')
                    .delete()
                    .eq('id', placeId)
                    .eq('user_id', userId);
            });

            if (error) throw new ApiError('NOT_FOUND', 'Place not found or unauthorized', 404);
            return successResponse(null, 200, {}, undefined, rateLimit);
        }

        throw new ApiError('METHOD_NOT_ALLOWED', 'Method not allowed', 405);

    } catch (err: any) {
        statusCode = err.status || 500;
        if (statusCode >= 500) Sentry.captureException(err);
        return errorResponse(err);
    } finally {
        const durationMs = Math.round(performance.now() - startTime);
        if (globalSupabase) {
            logRequest(globalSupabase, {
                apiKeyId, userId, endpoint, method, statusCode, durationMs, userAgent, ip
            });
        }
    }
}));
