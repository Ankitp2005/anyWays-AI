import * as Sentry from 'https://esm.sh/@sentry/deno@8.0.0';

/**
 * Enterprise Sentry Utility for Supabase Edge Functions
 * Supports environment-aware tracing, sanitization, and release tracking.
 */

const ENVIRONMENT = Deno.env.get('ENVIRONMENT') || 'local';
const RELEASE = Deno.env.get('RELEASE_VERSION') || '0.0.0-dev';
const DSN = Deno.env.get('SENTRY_DSN') || '';

import { withRateLimit } from './rateLimit.ts';

let isInitialized = false;

export const initSentry = () => {
  if (isInitialized || !DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: ENVIRONMENT,
    release: RELEASE,
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Security: Sanitize sensitive data (Part 5)
      return sanitizeSentryEvent(event);
    },
  });

  isInitialized = true;
};

/**
 * Sanitizes sensitive data from Sentry events (Part 1 & 5)
 */
function sanitizeSentryEvent(event: Sentry.Event): Sentry.Event {
  const sensitivePatterns = [/key/i, /token/i, /auth/i, /password/i, /secret/i];

  const mask = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key in obj) {
      if (sensitivePatterns.some(p => p.test(key))) {
        obj[key] = '[MASKED]';
      } else if (typeof obj[key] === 'object') {
        mask(obj[key]);
      }
    }
  };

  if (event.request?.headers) mask(event.request.headers);
  if (event.extra) mask(event.extra);
  if (event.breadcrumbs) {
    event.breadcrumbs.forEach(b => b.data && mask(b.data));
  }

  return event;
}

/**
 * Wraps an Edge Function handler with Sentry tracing and error handling (Part 1 & 2)
 */
export const withSentry = (handler: (req: Request) => Promise<Response>) => {
  // Chain the middlewares: Sentry -> RateLimit -> Handler
  return async (req: Request) => {
    initSentry();
    
    // Apply Rate Limiting first
    const rateLimitedHandler = withRateLimit(handler);
    
    const traceId = req.headers.get('x-trace-id') || crypto.randomUUID();
    const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID();

    return await Sentry.withScope(async (scope) => {
      scope.setTag("env", ENVIRONMENT);
      scope.setTag("trace_id", traceId);
      scope.setTag("correlation_id", correlationId);
      scope.setExtra("is_simulated", req.headers.get('x-simulation') === 'true');

      try {
        const response = await rateLimitedHandler(req);
        
        // Inject trace IDs into response headers for correlation
        const newHeaders = new Headers(response.headers);
        newHeaders.set('x-trace-id', traceId);
        newHeaders.set('x-correlation-id', correlationId);

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      } catch (error) {
        // Part 7: Error Classification
        const errorCategory = (error as any).category || 'UNHANDLED_EXCEPTION';
        scope.setTag("error_category", errorCategory);
        
        Sentry.captureException(error);
        
        return new Response(JSON.stringify({
          error: {
            message: "An internal error occurred. Ref: " + traceId,
            category: errorCategory,
            trace_id: traceId
          }
        }), { 
          status: 500, 
          headers: { "Content-Type": "application/json", "x-trace-id": traceId } 
        });
      }
    });
  };
};

/**
 * Tracks critical intelligence spans (Part 3)
 */
export const trackSpan = async <T>(
  name: string, 
  operation: string, 
  tags: Record<string, string>, 
  fn: () => Promise<T>
): Promise<T> => {
  return await Sentry.startSpan({ name, op: operation, attributes: tags }, async (span) => {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  });
};
