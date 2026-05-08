import { AnyWaysError, RateLimitError, AuthenticationError } from './errors.ts';

export interface FetchOptions extends RequestInit {
  baseUrl: string;
  apiKey: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function request<T>(
  path: string, 
  options: FetchOptions,
  attempt: number = 1
): Promise<T> {
  const { baseUrl, apiKey, ...init } = options;
  const url = `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

  const headers = new Headers(init.headers);
  headers.set('x-api-key', apiKey);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...init,
    headers,
  });

  // 1. Proactive Rate Limit Warning
  const remainingHeader = response.headers.get('X-RateLimit-Remaining');
  if (remainingHeader !== null) {
    const remaining = Number(remainingHeader);
    if (!isNaN(remaining) && remaining < 5 && remaining >= 0) {
      console.warn(`[AnyWays SDK] Warning: Rate limit nearly exhausted. Remaining: ${remaining}`);
    }
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = (data as any)?.error?.message || (data as any)?.error || response.statusText;
    
    // 2. Exponential Backoff for 429
    if (response.status === 429 && attempt <= 3) {
      const backoffMs = Math.pow(2, attempt) * 1000;
      console.warn(`[AnyWays SDK] Rate limited (429). Retrying in ${backoffMs}ms... (Attempt ${attempt}/3)`);
      await sleep(backoffMs);
      return request<T>(path, options, attempt + 1);
    }

    if (response.status === 429) {
      throw new RateLimitError(
        message,
        response.headers.get('Retry-After') ?? undefined,
        Number(response.headers.get('X-RateLimit-Limit')),
        remaining
      );
    }

    if (response.status === 401) {
      throw new AuthenticationError(message);
    }

    throw new AnyWaysError(
      message,
      response.status,
      (data as any)?.error?.code,
      (data as any)?.error?.details
    );
  }

  return (data as any).data ?? data;
}
