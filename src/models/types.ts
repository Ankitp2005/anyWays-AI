// --- Place Intelligence Models ---

export type ValidationState = 'CONFIRMED' | 'PENDING' | 'FLAGGED';
export type PlaceStatus = 'OPEN' | 'CLOSED' | 'MOVED' | 'RENNOVATING';

export interface ValidationSignal {
    type: 'OCR_MENU' | 'FOOT_TRAFFIC' | 'DIGITAL_FOOTPRINT' | 'USER_REPORT' | 'OPERATIONAL_PATTERN';
    confidence: number;
    timestamp: string;
    source: string;
}

export interface ApiKey {
    id: string;
    name: string;
    key: string;
    status: 'ACTIVE' | 'REVOKED';
    createdAt: string;
    lastUsed?: string;
}

export interface Place {
    id: string;
    name: string;
    address: string;
    category: string;
    status: PlaceStatus;
    validationState: ValidationState;
    confidenceScore: number;
    lastVerified: string;
    signals: ValidationSignal[];
    metadata: {
        hasEntrances: boolean;
        hasMenu: boolean;
        paymentMethods: string[];
    };
}

export interface Metric {
    label: string;
    value: string | number;
    change?: number; // percentage
    trend: 'up' | 'down' | 'neutral';
}

export interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[]; // Array of Tag IDs
    notebookId?: string; // Optional Notebook ID
    isFavorite?: boolean;
    createdAt: string; // ISO Date string
    updatedAt: string; // ISO Date string
}

export interface Tag {
    id: string;
    name: string;
    color: string; // Hex code or Tailwind color class
}

export interface Notebook {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
}

export interface AppPreferences {
    theme: 'light' | 'dark' | 'system';
    sidebarOpen: boolean;
}

export interface FilterState {
    searchQuery: string;
    selectedTags: string[];
    notebookId: string | null; // null means 'All Notes'
    favoritesOnly: boolean;
}
