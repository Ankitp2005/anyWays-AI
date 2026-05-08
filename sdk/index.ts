export { AnyWaysClient } from './core/client.ts';
export type { AnyWaysClientOptions } from './core/client.ts';

// Modules & Types
export * from './modules/signals.ts';
export * from './modules/places.ts';
export * from './modules/realtime.ts';

// Errors
export { AnyWaysError, RateLimitError, AuthenticationError } from './utils/errors.ts';

// Metadata
export const VERSION = '1.0.0';
