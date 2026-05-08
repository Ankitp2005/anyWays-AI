import { SignalsModule } from '../modules/signals.ts';
import { PlacesModule } from '../modules/places.ts';
import { LiveFeedClient } from '../modules/realtime.ts';
import { SupabaseClient } from '@supabase/supabase-js';

export interface AnyWaysClientOptions {
  baseUrl?: string;
}

export class AnyWaysClient {
  public signals: SignalsModule;
  public places: PlacesModule;
  private _realtime: LiveFeedClient | null = null;

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, options?: AnyWaysClientOptions) {
    if (!apiKey) {
      throw new Error('API Key is required to initialize AnyWaysClient');
    }

    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl || 'https://api.anyways.ai/functions/v1/';

    const config = { 
      apiKey: this.apiKey, 
      baseUrl: this.baseUrl,
      headers: {
        'User-Agent': `anyways-sdk-ts/1.0.0`
      }
    };

    this.signals = new SignalsModule(config);
    this.places = new PlacesModule(config);
  }

  /**
   * Initializes or returns the Realtime Live Feed client.
   * Requires an existing Supabase client and the target user ID.
   */
  public getRealtime(supabase: SupabaseClient, userId: string): LiveFeedClient {
    if (!this._realtime) {
      this._realtime = new LiveFeedClient(supabase, userId);
    }
    return this._realtime;
  }
}
