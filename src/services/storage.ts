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
    getPlaces: (): Place[] => {
        return [
            {
                id: 'pl_101',
                name: 'Chai Point - Indiranagar',
                address: '12th Main Rd, Indiranagar, Bengaluru, Karnataka 560038',
                category: 'Cafe',
                status: 'OPEN',
                validationState: 'CONFIRMED',
                confidenceScore: 0.98,
                lastVerified: new Date().toISOString(),
                signals: [
                    { type: 'FOOT_TRAFFIC', confidence: 0.99, timestamp: new Date().toISOString(), source: 'MobilityData_Partner' },
                    { type: 'OCR_MENU', confidence: 0.95, timestamp: new Date().toISOString(), source: 'WhatsApp_Business_API' }
                ],
                metadata: { hasEntrances: true, hasMenu: true, paymentMethods: ['UPI', 'Cash'] }
            },
            {
                id: 'pl_102',
                name: 'Rameshwaram Cafe',
                address: 'Green Glen Layout, Bellandur, Bengaluru',
                category: 'Restaurant',
                status: 'OPEN',
                validationState: 'CONFIRMED',
                confidenceScore: 0.99,
                lastVerified: new Date(Date.now() - 3600000).toISOString(),
                signals: [
                    { type: 'FOOT_TRAFFIC', confidence: 0.99, timestamp: new Date().toISOString(), source: 'High_Density_Alert' }
                ],
                metadata: { hasEntrances: true, hasMenu: false, paymentMethods: ['UPI'] }
            },
            {
                id: 'pl_103',
                name: 'Unknown Pop-up Store',
                address: 'Near Wipro Park, Koramangala',
                category: 'Retail',
                status: 'CLOSED',
                validationState: 'FLAGGED',
                confidenceScore: 0.45,
                lastVerified: new Date(Date.now() - 86400000).toISOString(),
                signals: [
                    { type: 'USER_REPORT', confidence: 0.60, timestamp: new Date().toISOString(), source: 'Community_Flag' }
                ],
                metadata: { hasEntrances: false, hasMenu: false, paymentMethods: [] }
            },
            {
                id: 'pl_104',
                name: 'Third Wave Coffee',
                address: 'Sarjapur Main Rd, HSR Layout',
                category: 'Cafe',
                status: 'OPEN',
                validationState: 'CONFIRMED',
                confidenceScore: 0.97,
                lastVerified: new Date().toISOString(),
                signals: [],
                metadata: { hasEntrances: true, hasMenu: true, paymentMethods: ['Card', 'UPI'] }
            }
        ];
    },

    savePlaces: (places: Place[]) => {
        // No-op for mock
        console.log('Saved places:', places.length);
    },

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
