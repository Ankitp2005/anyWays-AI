import { Place } from '../models/place.model';
import { ApiKey } from '../models/api-key.model';

class StoreService {
    private places: Place[] = [];
    private apiKeys: ApiKey[] = [];

    constructor() {
        this.initializeMockData();
    }

    private initializeMockData() {
        this.places = [
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
                    {
                        type: 'FOOT_TRAFFIC',
                        confidence: 0.99,
                        timestamp: new Date().toISOString(),
                        source: 'MobilityData_Partner',
                    },
                    {
                        type: 'OCR_MENU',
                        confidence: 0.95,
                        timestamp: new Date().toISOString(),
                        source: 'WhatsApp_Business_API',
                    },
                ],
                metadata: { hasEntrances: true, hasMenu: true, paymentMethods: ['UPI', 'Cash'] },
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
                    {
                        type: 'FOOT_TRAFFIC',
                        confidence: 0.99,
                        timestamp: new Date().toISOString(),
                        source: 'High_Density_Alert',
                    },
                ],
                metadata: { hasEntrances: true, hasMenu: false, paymentMethods: ['UPI'] },
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
                    {
                        type: 'USER_REPORT',
                        confidence: 0.60,
                        timestamp: new Date().toISOString(),
                        source: 'Community_Flag',
                    },
                ],
                metadata: { hasEntrances: false, hasMenu: false, paymentMethods: [] },
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
                metadata: { hasEntrances: true, hasMenu: true, paymentMethods: ['Card', 'UPI'] },
            },
        ];

        // Initial empty mock for keys, or could add one for testing
        this.apiKeys = [];
    }

    // Places Methods
    getPlaces(): Place[] {
        return this.places;
    }

    getPlaceById(id: string): Place | undefined {
        return this.places.find((p) => p.id === id);
    }

    // API Keys Methods
    getApiKeys(): ApiKey[] {
        return this.apiKeys;
    }

    addApiKey(key: ApiKey): void {
        this.apiKeys.push(key);
    }

    revokeApiKey(id: string): ApiKey | undefined {
        const key = this.apiKeys.find((k) => k.id === id);
        if (key) {
            key.status = 'REVOKED';
        }
        return key;
    }
}

export const store = new StoreService();
