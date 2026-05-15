import { supabase } from '../lib/supabaseClient';
import { Place, CreatePlaceDTO, UpdatePlaceDTO, ApiKey } from './api.types';
import { generateTraceContext } from '../lib/observability';

// ── Client-Side Sanitization ─────────────────────────────────────────────
const sanitize = (val: any): any => {
    if (typeof val === 'string') {
        return val.replace(/<[^>]*>/g, '').trim();
    }
    if (val !== null && typeof val === 'object') {
        const sanitized: any = Array.isArray(val) ? [] : {};
        for (const [key, value] of Object.entries(val)) {
            sanitized[key] = sanitize(value);
        }
        return sanitized;
    }
    return val;
};

// =========================================================================
// DASHBOARD SERVICES (Direct Supabase DB Access via RLS)
// =========================================================================

const auth = {
// ... (rest of the file)
    // Auth is now managed directly by AuthContext.tsx, but we can expose helpers
    getCurrentSession: async () => {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
    }
};

const places = {
    getPlaces: async (): Promise<Place[]> => {
        generateTraceContext();
        const { data, error } = await supabase
            .from('places')
            .select('*', { head: false, count: 'exact' })
            .order('created_at', { ascending: false });
        
        if (error) throw new Error(error.message);
        return data as unknown as Place[];
    },
    
    getPlace: async (id: string): Promise<Place> => {
        const { data: { session } } = await supabase.auth.getSession();
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/places?id=${id}`;
        
        // Part 2: Trace propagation
        const { headers: traceHeaders } = generateTraceContext();

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                ...traceHeaders
            }
        });
            
        if (!response.ok) throw new Error('Failed to fetch place');
        const json = await response.json();
        if (!json.success) throw new Error(json.error?.message || 'Failed to fetch place');
        return json.data as Place;
    },
    
    createPlace: async (placeData: CreatePlaceDTO): Promise<Place> => {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error('Not logged in');

        const cleanData = sanitize(placeData);

        const { data, error } = await supabase
            .from('places')
            .insert([{ 
                user_id: user.user.id,
                name: cleanData.name, 
                address: cleanData.address,
                latitude: cleanData.latitude,
                longitude: cleanData.longitude
            }])
            .select()
            .single();
            
        if (error) throw new Error(error.message);
        return data as unknown as Place;
    },
    
    updatePlace: async (id: string, placeData: UpdatePlaceDTO): Promise<Place> => {
        const cleanData = sanitize(placeData);
        const { data, error } = await supabase
            .from('places')
            .update(cleanData)
            .eq('id', id)
            .select()
            .single();
            
        if (error) throw new Error(error.message);
        return data as unknown as Place;
    },
    
    deletePlace: async (id: string): Promise<void> => {
        const { error } = await supabase.from('places').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }
};

const apiKeys = {

    /**
     * Fetch only ACTIVE (non-revoked) keys for the logged-in user.
     * RLS ensures users only see their own rows.
     * We additionally filter revoked_at IS NULL so revoked keys
     * never appear in the UI even if RLS policy changes.
     */
    getApiKeys: async (): Promise<ApiKey[]> => {
        generateTraceContext();
        const { data, error } = await supabase
            .from('api_keys')
            .select('id, name, permissions, created_at, last_used_at')
            .is('revoked_at', null)                          // ← active only
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data as unknown as ApiKey[];
    },

    /**
     * Get real-time usage metrics for the current month.
     */
    getMonthlyUsage: async (): Promise<{ used: number; limit: number }> => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Not authenticated');

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Fetch user's API keys
        const { data: keys } = await supabase
            .from('api_keys')
            .select('id')
            .eq('user_id', userData.user.id);

        let used = 0;
        const keyIds = keys?.map(k => k.id) || [];

        if (keyIds.length > 0) {
            // Count usages in the api_key_usage table
            const { count, error } = await supabase
                .from('api_key_usage')
                .select('*', { count: 'exact', head: true })
                .in('api_key_id', keyIds)
                .gte('timestamp', startOfMonth.toISOString());
            
            if (error) console.error("Error fetching usage:", error);
            used = count || 0;
        }

        return { used, limit: 100000 };
    },

    /**
     * Generate a new API key.
     *
     * Security model:
     *   1. Generate a random UUID as the raw key (never stored).
     *   2. SHA-256 hash it — only the hash goes to the DB.
     *   3. Return the raw key ONCE to the caller for display.
     *      After this function returns, the raw key is gone forever.
     *
     * Returns: { record: DB row, rawKey: string (show once) }
     */
    generateApiKey: async (name: string): Promise<{ record: ApiKey; rawKey: string }> => {
        // Step 1 — get current user (RLS will also enforce this, belt + braces)
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw new Error('Not authenticated');

        // Step 2 — generate raw key (UUID v4)
        const rawKey = crypto.randomUUID();

        // Step 3 — hash with SHA-256 using Web Crypto API (available in all modern browsers)
        const encoder    = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
        const keyHash    = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        // Step 4 — store ONLY the hash in the DB (raw key never persisted)
        const { data: record, error: insertError } = await supabase
            .from('api_keys')
            .insert([{
                user_id:     userData.user.id,
                name:        name.trim() || `Key ${Date.now()}`,
                key_hash:    keyHash,
                permissions: ['read'],                       // default permission
            }])
            .select('id, name, permissions, created_at, last_used_at')
            .single();

        if (insertError) throw new Error(insertError.message);

        return {
            record:  record as unknown as ApiKey,
            rawKey,  // ← caller displays this ONCE, then discards it
        };
    },

    /**
     * Revoke a key by setting revoked_at to now.
     * RLS ensures users can only revoke their own keys.
     * The row is kept for audit purposes — never hard-deleted.
     */
    revokeApiKey: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('api_keys')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw new Error(error.message);
    },
};

const signals = {
    /**
     * Fetch all validation signals for a given place.
     * DB table: validation_signals
     * Columns: id, place_id, signal_type, signal_value, confidence_impact, detected_at, created_at
     */
    getSignalsForPlace: async (placeId: string) => {
        const { data, error } = await supabase
            .from('validation_signals')
            .select('*')
            .eq('place_id', placeId)
            .order('detected_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Fetch the N most recent signals across all places owned by the user.
     * Useful for dashboard activity feeds.
     */
    getRecentSignals: async (limit: number = 20) => {
        const { data, error } = await supabase
            .from('validation_signals')
            .select('*, places!inner(user_id, name)')
            .order('detected_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return data;
    },
};

// =========================================================================
// EXTERNAL SIMULATION (Calling Edge Functions directly)
// =========================================================================

const externalAPI = {
    // This simulates an external robot SDK ingesting a signal using an API Key
    // rather than the logged-in dashboard user.
    ingestSignalExternally: async (apiKey: string, payload: any) => {
        // Part 2: Generate and propagate trace context
        const { headers: traceHeaders } = generateTraceContext();

        const { data, error } = await supabase.functions.invoke('signals', {
            method: 'POST',
            headers: { 
                'x-api-key': apiKey,
                ...traceHeaders 
            },
            body: payload
        });

        if (error) throw new Error(error.message);
        return data; // Returns { success, newScore, place }
    }
}

export default {
    auth,
    places,
    signals,
    apiKeys,
    externalAPI
};
