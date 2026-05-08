import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import type { Place, CreatePlaceDTO, UpdatePlaceDTO } from '../services/api.types';
import toast from 'react-hot-toast';

/**
 * usePlaces
 * ─────────
 * Fetches and manages the places list from Supabase.
 * RLS ensures only the authenticated user's places are returned.
 *
 * Usage:
 *   const { places, loading, error, addPlace, updatePlace, deletePlace, refresh } = usePlaces();
 */
export function usePlaces() {
    const [places, setPlaces]   = useState<Place[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.places.getPlaces();
            setPlaces(data);
        } catch (err: any) {
            setError(err.message);
            toast.error('Failed to load places');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => { fetch(); }, [fetch]);

    const addPlace = useCallback(async (placeData: CreatePlaceDTO): Promise<Place> => {
        const newPlace = await api.places.createPlace(placeData);
        setPlaces(prev => [newPlace, ...prev]);   // optimistic prepend
        toast.success(`"${newPlace.name}" added`);
        return newPlace;
    }, []);

    const updatePlace = useCallback(async (id: string, placeData: UpdatePlaceDTO): Promise<Place> => {
        const updated = await api.places.updatePlace(id, placeData);
        setPlaces(prev => prev.map(p => p.id === id ? updated : p));
        toast.success('Place updated');
        return updated;
    }, []);

    const deletePlace = useCallback(async (id: string): Promise<void> => {
        const snapshot = places; // for rollback
        setPlaces(prev => prev.filter(p => p.id !== id));  // optimistic delete
        try {
            await api.places.deletePlace(id);
            toast.success('Place deleted');
        } catch (err: any) {
            setPlaces(snapshot);  // rollback on failure
            toast.error('Failed to delete place');
            throw err;
        }
    }, [places]);

    return {
        places,
        loading,
        error,
        refresh: fetch,
        addPlace,
        updatePlace,
        deletePlace,
    };
}

/**
 * usePlaceDetails
 * ───────────────
 * Fetches a single place with its nested validation_signals.
 * Re-fetches whenever placeId changes.
 *
 * Usage:
 *   const { place, loading, refresh } = usePlaceDetails(placeId);
 */
export function usePlaceDetails(placeId: string | null) {
    const [place, setPlace]     = useState<Place | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!placeId) { setPlace(null); return; }
        setLoading(true);
        setError(null);
        try {
            const data = await api.places.getPlace(placeId);
            setPlace(data);
        } catch (err: any) {
            setError(err.message);
            toast.error('Failed to load place details');
        } finally {
            setLoading(false);
        }
    }, [placeId]);

    useEffect(() => { fetch(); }, [fetch]);

    return { place, loading, error, refresh: fetch };
}
