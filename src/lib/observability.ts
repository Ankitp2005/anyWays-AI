import * as Sentry from "@sentry/react";
import { v4 as uuidv4 } from 'uuid';

/**
 * Enterprise-Grade Observability Configuration
 * Supports LOCAL, STAGING, PRODUCTION with strict isolation.
 */

export const ENV = (import.meta.env.VITE_APP_ENV || 'local').toLowerCase() as 'local' | 'staging' | 'production';
export const RELEASE = import.meta.env.VITE_APP_RELEASE || '0.0.0-dev';

// Operational Error Categories (Part 7)
export enum ErrorCategory {
  INTELLIGENCE_FAILURE = 'INTELLIGENCE_FAILURE',
  TRUST_ENGINE_FAILURE = 'TRUST_ENGINE_FAILURE',
  DRIFT_ENGINE_FAILURE = 'DRIFT_ENGINE_FAILURE',
  COLLAPSE_CONTROL_FAILURE = 'COLLAPSE_CONTROL_FAILURE',
  CONSENSUS_FAILURE = 'CONSENSUS_FAILURE',
  DATABASE_RPC_FAILURE = 'DATABASE_RPC_FAILURE',
  EDGE_TIMEOUT = 'EDGE_TIMEOUT',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  SIMULATION_LEAK_ATTEMPT = 'SIMULATION_LEAK_ATTEMPT',
}

export interface OperationalMetadata {
  category: ErrorCategory;
  severity: Sentry.SeverityLevel;
  placeId?: string;
  signalType?: string;
  traceId: string;
  correlationId: string;
  [key: string]: any;
}

/**
 * Sanitizes sensitive data before sending to Sentry (Part 1 & 5)
 */
const sanitizeEvent = (event: Sentry.ErrorEvent): Sentry.ErrorEvent => {
  // Deep scan and mask sensitive patterns
  const sensitiveKeys = ['apiKey', 'token', 'auth', 'password', 'secret', 'key'];
  
  const maskStrings = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    Object.keys(obj).forEach(key => {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        obj[key] = '[MASKED]';
      } else if (typeof obj[key] === 'object') {
        maskStrings(obj[key]);
      }
    });
    return obj;
  };

  if (event.extra) maskStrings(event.extra);
  if (event.request?.headers) maskStrings(event.request.headers);
  if (event.breadcrumbs) {
    event.breadcrumbs.forEach(breadcrumb => {
      if (breadcrumb.data) maskStrings(breadcrumb.data);
    });
  }

  return event;
};

/**
 * Initializes Sentry for the Enterprise Stack (Part 1)
 */
export const initObservability = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn && ENV !== 'local') {
    console.warn('Sentry DSN missing in non-local environment');
  }

  Sentry.init({
    dsn: dsn || "",
    environment: ENV,
    release: RELEASE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    
    // Part 4: Performance Monitoring Sampling
    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,
    
    // Part 1: Replayable failure diagnostics
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    beforeSend: (event) => {
      // Part 8: Block alerts for simulation data in production
      const isSimulation = event.extra?.isSimulation === true;
      if (ENV === 'production' && isSimulation) {
        return null; 
      }
      return sanitizeEvent(event);
    },
  });

  // Set initial tags
  Sentry.setTag("app.environment", ENV);
  Sentry.setTag("app.version", RELEASE);
};

/**
 * Captures a structured operational error (Part 7)
 */
export const captureOperationalError = (
  error: Error | string,
  meta: OperationalMetadata
) => {
  Sentry.withScope((scope) => {
    scope.setLevel(meta.severity);
    scope.setTag("operational.category", meta.category);
    scope.setTag("trace.id", meta.traceId);
    scope.setTag("correlation.id", meta.correlationId);
    if (meta.placeId) scope.setTag("place.id", meta.placeId);
    
    scope.setContext("operational_context", meta);
    
    Sentry.captureException(typeof error === 'string' ? new Error(error) : error);
  });
};

/**
 * Generates a new trace context for distributed tracing (Part 2)
 */
export const generateTraceContext = () => {
  const traceId = uuidv4();
  const correlationId = uuidv4();
  
  return {
    traceId,
    correlationId,
    headers: {}
  };
};

/**
 * Tracks intelligence pipeline events (Part 3)
 */
export const trackIntelligenceFlow = (
  flowName: string,
  status: 'started' | 'completed' | 'failed' | 'fallback',
  data: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    category: 'intelligence.pipeline',
    message: `${flowName} ${status}`,
    level: status === 'failed' ? 'error' : 'info',
    data,
  });

  if (status === 'failed') {
    captureOperationalError(`Intelligence Pipeline Failure: ${flowName}`, {
      category: ErrorCategory.INTELLIGENCE_FAILURE,
      severity: 'error',
      traceId: data.traceId || 'unknown',
      correlationId: data.correlationId || 'unknown',
      ...data
    });
  }
};
