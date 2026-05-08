export interface ApiKey {
    id: string;
    name: string;
    key: string;
    status: 'ACTIVE' | 'REVOKED';
    createdAt: string;
    lastUsed?: string;
}
