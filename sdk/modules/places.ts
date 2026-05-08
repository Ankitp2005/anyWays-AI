import { request } from '../utils/fetch.ts';

export interface Place {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  status: 'OPEN' | 'CLOSED' | 'PERMANENTLY_CLOSED';
  confidence_score: number;
  created_at: string;
}

export interface CreatePlaceParams {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
}

export class PlacesModule {
  constructor(private config: { baseUrl: string; apiKey: string; headers?: Record<string, string> }) {}

  /**
   * List all places owned by the authenticated user.
   */
  async list(): Promise<Place[]> {
    return request<Place[]>('places', {
      ...this.config,
      method: 'GET',
    });
  }

  /**
   * Get a single place by ID, including its validation signals.
   */
  async get(id: string): Promise<Place & { validation_signals: any[] }> {
    return request<Place & { validation_signals: any[] }>(`places?id=${id}`, {
      ...this.config,
      method: 'GET',
    });
  }

  /**
   * Create a new place.
   */
  async create(params: CreatePlaceParams): Promise<Place> {
    return request<Place>('places', {
      ...this.config,
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Update an existing place.
   */
  async update(id: string, params: Partial<CreatePlaceParams>): Promise<Place> {
    return request<Place>(`places?id=${id}`, {
      ...this.config,
      method: 'PUT',
      body: JSON.stringify(params),
    });
  }

  /**
   * Delete a place.
   */
  async delete(id: string): Promise<void> {
    return request<void>(`places?id=${id}`, {
      ...this.config,
      method: 'DELETE',
    });
  }

  /**
   * Get validation summary for a place.
   */
  async getValidationSummary(id: string): Promise<any> {
    return request<any>(`places/${id}/validate`, {
      ...this.config,
      method: 'GET',
    });
  }
}
