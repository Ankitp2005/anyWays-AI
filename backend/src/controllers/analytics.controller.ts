import { Request, Response } from 'express';
import { supabaseAdmin } from '../utils/supabase';

export const getDashboardAnalytics = async (req: Request, res: Response) => {
    try {
        // Compute latest metrics for today
        await supabaseAdmin.rpc('compute_daily_metrics');

        // Fetch last 30 days of metrics
        const { data: metrics, error: metricsError } = await supabaseAdmin
            .from('daily_system_metrics')
            .select('*')
            .order('date', { ascending: false })
            .limit(30);

        if (metricsError) throw metricsError;

        // Fetch top risky places (score < 50)
        const { data: riskyPlaces, error: riskyError } = await supabaseAdmin
            .from('places')
            .select('id, name, address, confidence_score, status, last_validated_at')
            .lt('confidence_score', 50)
            .order('confidence_score', { ascending: true })
            .limit(10);

        if (riskyError) throw riskyError;

        // Fetch current score distribution across all places
        const { data: places, error: placesError } = await supabaseAdmin
            .from('places')
            .select('confidence_score');

        if (placesError) throw placesError;

        const scoreDistribution = {
            '0-20': 0,
            '21-50': 0,
            '51-80': 0,
            '81-100': 0,
        };

        places.forEach(place => {
            const score = place.confidence_score;
            if (score <= 20) scoreDistribution['0-20']++;
            else if (score <= 50) scoreDistribution['21-50']++;
            else if (score <= 80) scoreDistribution['51-80']++;
            else scoreDistribution['81-100']++;
        });

        res.json({
            status: 'success',
            data: {
                metrics,
                scoreDistribution,
                riskyPlaces
            }
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch analytics data' });
    }
};
