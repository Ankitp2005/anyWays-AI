export class AnyWaysError extends Error {
  constructor(
    public message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AnyWaysError';
  }
}

export class RateLimitError extends AnyWaysError {
  constructor(
    message: string,
    public retryAfter?: string,
    public limit?: number,
    public remaining?: number
  ) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends AnyWaysError {
  constructor(message: string) {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'AuthenticationError';
  }
}
