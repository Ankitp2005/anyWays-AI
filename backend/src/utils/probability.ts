import { supabaseAdmin } from './supabase';

let calibrationBuckets: any[] = [];
let lastFetched = 0;

/**
 * Maps a confidence score (0-100) to a real probability based on historical data.
 * Caches buckets for 1 minute to avoid excessive DB calls.
 */
export const getRealProbability = async (score: number): Promise<number> => {
    try {
        if (Date.now() - lastFetched > 60000 || calibrationBuckets.length === 0) {
            const { data, error } = await supabaseAdmin.from('score_calibration').select('*');
            if (!error && data) {
                calibrationBuckets = data;
                lastFetched = Date.now();
            }
        }
        
        const bucket = calibrationBuckets.find(b => score >= b.score_min && score <= b.score_max);
        
        if (bucket) {
            return bucket.success_rate;
        }
    } catch (err) {
        console.error('Error fetching score calibration:', err);
    }
    
    // Fallback if buckets are empty or error occurs
    return Number((score / 100).toFixed(2));
};
