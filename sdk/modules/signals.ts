import { request } from '../utils/fetch.ts';

export type SignalType = 
  | 'FOOT_TRAFFIC' 
  | 'OCR_MENU' 
  | 'SOCIAL_SENTIMENT' 
  | 'HOURS_VERIFIED' 
  | 'PHONE_VERIFIED' 
  | 'PICKUP_LOCATION_VERIFIED';

export interface IngestSignalParams {
  place_id: string;
  signal_type: SignalType;
  signal_value: string | object;
}

export interface IngestSignalResponse {
  newScore: number;
  scoreLabel: string;
  place: any;
}

export class SignalsModule {
  constructor(private config: { baseUrl: string; apiKey: string; headers?: Record<string, string> }) {}

  /**
   * Send a verification signal with built-in reliability features.
   * @param params Signal parameters
   * @param options Reliability options (maxRetries, timeout)
   */
  async sendSignal(
    params: IngestSignalParams,
    options: { maxRetries?: number; timeoutMs?: number } = {}
  ): Promise<IngestSignalResponse> {
    const { maxRetries = 2, timeoutMs = 5000 } = options;
    let attempts = 0;

    const execute = async (): Promise<IngestSignalResponse> => {
      attempts++;
      
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await request<IngestSignalResponse>('signals-v2', {
          ...this.config,
          method: 'POST',
          body: JSON.stringify({
            ...params,
            signal_value: typeof params.signal_value === 'object' 
              ? JSON.stringify(params.signal_value) 
              : params.signal_value
          }),
          signal: controller.signal,
        });
        clearTimeout(id);
        return response;
      } catch (err: any) {
        clearTimeout(id);
        
        const isRetryable = err.name === 'AbortError' || (err.status && err.status >= 500);
        
        if (isRetryable && attempts <= maxRetries) {
          console.warn(`[Signals] Attempt ${attempts} failed, retrying...`, err.message);
          return execute();
        }
        throw err;
      }
    };

    return execute();
  }

  /**
   * Alias for sendSignal (Legacy compatibility)
   */
  async ingest(params: IngestSignalParams): Promise<IngestSignalResponse> {
    return this.sendSignal(params);
  }
}
