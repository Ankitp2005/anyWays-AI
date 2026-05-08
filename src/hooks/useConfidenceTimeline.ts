import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { SignalEvent } from '../models/types';

export type Timeframe = '24h' | '7d' | '30d';

export function useConfidenceTimeline(placeId: string, timeframe: Timeframe) {
    const [data, setData] = useState<SignalEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTimeline = useCallback(async () => {
        if (!placeId) return;
        setLoading(true);
        try {
            const { data: history, error } = await supabase.rpc('get_place_signal_history', { p_place_id: placeId });
            
            if (!error && history) {
                // The RPC returns newest first. We need oldest first for the chart (left to right)
                let sorted = [...(history as SignalEvent[])].reverse();

                // Filter by timeframe
                const now = new Date().getTime();
                let cutoffHours = 24;
                if (timeframe === '7d') cutoffHours = 24 * 7;
                if (timeframe === '30d') cutoffHours = 24 * 30;
                
                const cutoffTime = now - (cutoffHours * 60 * 60 * 1000);

                sorted = sorted.filter(evt => new Date(evt.created_at).getTime() >= cutoffTime);

                setData(sorted);
            }
        } catch {
            // Silently handle fetch failures — chart will show empty state
        }
        setLoading(false);
    }, [placeId, timeframe]);

    useEffect(() => {
        if (!placeId) return;

        let cancelled = false;

        fetchTimeline();
        
        // Unique channel name prevents collisions even in React StrictMode double-mount
        const channelName = `timeline_${placeId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'validation_signals',
                    filter: `place_id=eq.${placeId}`
                },
                (payload) => {
                    if (cancelled) return;
                    const newEvent = payload.new as SignalEvent;
                    setData(prev => {
                        // Deduplicate
                        if (prev.find(e => e.id === newEvent.id)) return prev;
                        return [...prev, newEvent];
                    });
                }
            )
            .subscribe();

        return () => {
            cancelled = true;
            supabase.removeChannel(channel);
        };
    }, [placeId, fetchTimeline]);

    return { data, loading };
}
