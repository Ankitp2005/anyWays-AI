export type PlaceStatus = 'OPEN' | 'CLOSED' | 'MOVED' | 'RENNOVATING';
export type ValidationState = 'CONFIRMED' | 'PENDING' | 'FLAGGED';

export interface ValidationSignal {
    type:
    | 'OCR_MENU'
    | 'FOOT_TRAFFIC'
    | 'DIGITAL_FOOTPRINT'
    | 'USER_REPORT'
    | 'OPERATIONAL_PATTERN';
    confidence: number;
    timestamp: string;
    source: string;
}

export interface PlaceMetadata {
    hasEntrances: boolean;
    hasMenu: boolean;
    paymentMethods: string[];
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
    metadata: PlaceMetadata;
}
