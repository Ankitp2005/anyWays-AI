import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { SignalEvent } from '../models/types';

export type LiveStatus = 'LIVE' | 'RECONNECTING' | 'OFFLINE';

/**
 * Subscribes to real-time signal_events for a given placeId.
 * All lifecycle management is internal — no external subscribe/unsubscribe needed.
 */
export function useLiveSignals(placeId: string | null) {
    const [events, setEvents] = useState<SignalEvent[]>([]);
    const [status, setStatus] = useState<LiveStatus>('OFFLINE');
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!placeId) {
            setEvents([]);
            setStatus('OFFLINE');
            return;
        }

        let cancelled = false;
        setStatus('RECONNECTING');

        // 1. Fetch historical events
        const fetchHistory = async () => {
            try {
                const { data, error } = await supabase.rpc('get_place_signal_history', { p_place_id: placeId });
                if (!error && data && !cancelled) {
                    setEvents(data.slice(0, 50) as SignalEvent[]);
                }
            } catch {
                // silently ignore history fetch failures
            }
        };
        fetchHistory();

        // 2. Create realtime subscription
        // Unique channel name prevents collisions even in React StrictMode double-mount
        const channelName = `sig_${placeId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

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
                    setEvents(prev => {
                        if (prev.find(e => e.id === newEvent.id)) return prev;
                        return [newEvent, ...prev].slice(0, 50);
                    });
                }
            )
            .subscribe((s) => {
                if (cancelled) return;
                if (s === 'SUBSCRIBED') setStatus('LIVE');
                else if (s === 'CLOSED') setStatus('OFFLINE');
                else if (s === 'CHANNEL_ERROR') setStatus('RECONNECTING');
            });

        // 3. Cleanup on unmount or placeId change
        return () => {
            cancelled = true;
            setStatus('OFFLINE');
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
            supabase.removeChannel(channel);
        };
    }, [placeId]);

    return { events, status };
}
