import type { Note, Notebook, Tag, AppPreferences, Place, ApiKey } from '../models/types';

const STORAGE_KEYS = {
    NOTES: 'anyways_notes',
    TAGS: 'anyways_tags',
    NOTEBOOKS: 'anyways_notebooks',
    PREFERENCES: 'anyways_preferences',
    API_KEYS: 'anyways_api_keys'
};

export const StorageService = {
    // --- Place Intelligence Data ---
    // DEPRECATED: Places are now fetched from Supabase via api.places.getPlaces().
    // These stubs exist only to satisfy any lingering imports.
    getPlaces: (): Place[] => [],
    savePlaces: (_places: Place[]) => {},


    // --- Legacy Storage ---
    getNotes: (): Note[] => {
        const data = localStorage.getItem(STORAGE_KEYS.NOTES);
        return data ? JSON.parse(data) : [];
    },

    saveNotes: (notes: Note[]) => {
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    },

    getTags: (): Tag[] => {
        const data = localStorage.getItem(STORAGE_KEYS.TAGS);
        return data ? JSON.parse(data) : [];
    },

    saveTags: (tags: Tag[]) => {
        localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags));
    },

    getNotebooks: (): Notebook[] => {
        const data = localStorage.getItem(STORAGE_KEYS.NOTEBOOKS);
        return data ? JSON.parse(data) : [];
    },

    saveNotebooks: (notebooks: Notebook[]) => {
        localStorage.setItem(STORAGE_KEYS.NOTEBOOKS, JSON.stringify(notebooks));
    },

    getPreferences: (): AppPreferences => {
        const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
        return data ? JSON.parse(data) : { theme: 'system', sidebarOpen: true };
    },

    savePreferences: (prefs: AppPreferences) => {
        localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
    },

    getApiKeys: (): ApiKey[] => {
        const data = localStorage.getItem(STORAGE_KEYS.API_KEYS);
        return data ? JSON.parse(data) : [];
    },

    saveApiKeys: (keys: ApiKey[]) => {
        localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
    }
};
