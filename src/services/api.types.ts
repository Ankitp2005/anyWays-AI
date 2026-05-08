
export interface User {
    id: string;
    email: string;
    name?: string;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface ApiKey {
    id: string;
    name: string;
    permissions: string[];
    createdAt: string;
    lastUsedAt?: string;
    key?: string; // Only returned on creation
}

export interface ValidationSignal {
    id:                string;
    place_id:          string;   // FK → places.id
    signal_type:       'FOOT_TRAFFIC' | 'OCR_MENU' | 'SOCIAL_SENTIMENT' | 'HOURS_VERIFIED' | 'PHONE_VERIFIED' | 'PICKUP_LOCATION_VERIFIED';
    signal_value:      Record<string, unknown>;  // JSONB — shape varies per signal_type
    confidence_impact: number;
    detected_at:       string;   // ISO 8601 timestamp
    created_at:        string;
}

export interface Place {
    id: string;
    user_id: string;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    status: 'OPEN' | 'CLOSED' | 'TEMPORARILY_CLOSED' | 'PERMANENTLY_CLOSED';
    confidence_score: number;
    derived_status?: 'LIKELY_OPEN' | 'LIKELY_CLOSED' | 'UNCERTAIN';
    // Collapse Control Layer (Rule 5)
    collapse_allowed?: boolean;
    collapse_reason?: string;
    signal_consensus_score?: number;
    last_validated_at?: string;
    created_at: string;
    updated_at: string;
    validation_signals?: ValidationSignal[];
    // Legacy camelCase aliases (for backwards compat)
    confidenceScore?: number;
    lastValidatedAt?: string;
    // API enrichment fields
    success_probability?: number;
    expected_value?: number;
    recommended_action?: string;
    reasoning?: string;
    confidence_interval?: number[];
    reliability?: string;
}


export interface CreatePlaceDTO {
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    status?: 'OPEN' | 'CLOSED' | 'TEMPORARILY_CLOSED' | 'PERMANENTLY_CLOSED';
}

export interface UpdatePlaceDTO {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    status?: 'OPEN' | 'CLOSED' | 'TEMPORARILY_CLOSED' | 'PERMANENTLY_CLOSED';
}

export interface CreateSignalDTO {
    signalType: 'FOOT_TRAFFIC' | 'OCR_MENU' | 'SOCIAL_SENTIMENT' | 'HOURS_VERIFIED' | 'PHONE_VERIFIED' | 'PICKUP_LOCATION_VERIFIED';
    signalValue: any;
    confidenceImpact: number;
}

export class AuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthError';
    }
}

export class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}
