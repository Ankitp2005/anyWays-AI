import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { corsHeaders } from '../shared/cors.ts';
import { successResponse, errorResponse, ApiError } from '../shared/apiResponse.ts';
import { validateApiKey } from '../shared/apiKeyUtils.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const globalSupabase = supabaseUrl && supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey) 
    : null;
const globalAnonClient = supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (!globalSupabase || !globalAnonClient) {
            throw new ApiError('INTERNAL_ERROR', 'Missing Supabase environment variables', 500);
        }

        const authHeader = req.headers.get('Authorization');
        const apiKeyHeader = req.headers.get('x-api-key');

        let isServiceRole = false;
        if (authHeader === `Bearer ${supabaseServiceKey}`) {
            isServiceRole = true;
        }

        if (!isServiceRole) {
            if (apiKeyHeader) {
                // For admin API key
                const keyMeta = await validateApiKey(req, 'system');
                if (!keyMeta.permissions?.includes('admin')) {
                    throw new ApiError('FORBIDDEN', 'Requires admin permissions', 403);
                }
            } else if (authHeader?.startsWith('Bearer ')) {
                const jwt = authHeader.replace('Bearer ', '');
                if (jwt === supabaseAnonKey) {
                    throw new ApiError('UNAUTHORIZED', 'Public/anon access is forbidden', 401);
                }
                const { data: { user }, error } = await globalAnonClient.auth.getUser(jwt);
                if (error || !user) throw new ApiError('UNAUTHORIZED', 'Invalid JWT', 401);
                // Can optionally check user roles here
            } else {
                throw new ApiError('UNAUTHORIZED', 'Provide x-api-key or Authorization header', 401);
            }
        }

        if (req.method !== 'GET') {
            throw new ApiError('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
        }

        // Fetch latest metrics (7 days)
        const { data: metricsData, error: metricsError } = await globalSupabase
            .from('model_performance_metrics')
            .select('*')
            .order('metric_date', { ascending: false })
            .limit(7);

        // Fetch unresolved alerts
        const { data: alertsData, error: alertsError } = await globalSupabase
            .from('system_alerts')
            .select('*')
            .eq('is_resolved', false)
            .order('created_at', { ascending: false });

        if (metricsError && metricsError.code !== 'PGRST116') {
            throw new ApiError('INTERNAL_ERROR', metricsError.message, 500);
        }
        
        if (alertsError) {
            throw new ApiError('INTERNAL_ERROR', alertsError.message, 500);
        }

        const latestMetrics = metricsData && metricsData.length > 0 ? metricsData[0] : {
            status: 'HEALTHY',
            accuracy: 0.0,
            drift_score: 0.0,
            total_predictions: 0,
            created_at: new Date().toISOString()
        };

        const confidence = latestMetrics.total_predictions >= 100 ? 'HIGH' : 
                           latestMetrics.total_predictions >= 30 ? 'MEDIUM' : 'LOW';

        const last_7_days_accuracy = (metricsData || []).map(m => m.accuracy).reverse();
        const last_7_days_drift = (metricsData || []).map(m => m.drift_score).reverse();

        return successResponse({
            status: latestMetrics.status,
            accuracy: latestMetrics.accuracy,
            drift_score: latestMetrics.drift_score,
            confidence: confidence,
            last_updated: latestMetrics.created_at,
            alerts: alertsData || [],
            last_7_days_accuracy,
            last_7_days_drift
        }, 200);

    } catch (err: any) {
        return errorResponse(err);
    }
});
