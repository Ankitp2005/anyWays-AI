import { Request, Response } from 'express';
import { supabaseAdmin } from '../utils/supabase';

export const logDeliveryAttempt = async (req: Request, res: Response) => {
    try {
        const { place_id, predicted_score, actual_outcome, failure_reason } = req.body;

        // Derive label automatically for analytics convenience
        const predicted_label = predicted_score >= 80 ? 'SAFE' : predicted_score >= 50 ? 'WARNING' : 'RISKY';

        const { data, error } = await supabaseAdmin
            .from('delivery_attempts')
            .insert({
                place_id,
                predicted_score,
                predicted_label,
                actual_outcome,
                failure_reason
            })
            .select()
            .single();

        if (error) {
            console.error('Error inserting delivery attempt:', error);
            return res.status(400).json({ error: error.message });
        }

        return res.status(201).json(data);
    } catch (err) {
        console.error('Delivery attempt error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getDeliveryAttemptsByPlace = async (req: Request, res: Response) => {
    try {
        const { place_id } = req.params;
        
        const { data, error } = await supabaseAdmin
            .from('delivery_attempts')
            .select('*')
            .eq('place_id', place_id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
