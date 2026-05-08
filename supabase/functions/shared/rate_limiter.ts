/**
 * rate_limiter.ts
 * Modular Token Bucket Rate Limiter for Supabase Edge Functions (Deno).
 * Uses PostgreSQL as the storage backend via the Supabase Client.
 * 
 * Strategy: Token Bucket
 * Behavior: 
 *  - Refills based on time elapsed
 *  - Atomic updates (as much as possible via single UPDATE statement)
 *  - Fail-open strategy on database errors to prevent system-wide blocking.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Configuration for the rate limiter.
 */
export interface RateLimiterConfig {
  /** Maximum number of tokens the bucket can hold (burst capacity) */
  capacity: number;
  /** Number of tokens added to the bucket every second */
  refill_rate_per_sec: number;
}

/**
 * Result of a rate limit check.
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of tokens remaining in the bucket after this request */
  remaining: number;
  /** The total burst capacity (for X-RateLimit-Limit header) */
  limit: number;
  /** ISO timestamp when the bucket might be fully refilled (approximate) */
  resetAt: string;
}

/**
 * Base interface for rate limiters.
 */
export interface RateLimiter {
  /**
   * Check if a request should be allowed.
   * @param key Unique identifier for the client (e.g., API Key, IP, User ID)
   * @param path The resource path or endpoint being protected
   */
  allow(key: string, path: string): Promise<RateLimitResult>;
}

/**
 * Token Bucket implementation using Supabase/Postgres.
 */
export class PostgresTokenBucket implements RateLimiter {
  private supabase: SupabaseClient;
  private config: RateLimiterConfig;

  constructor(supabase: SupabaseClient, config: RateLimiterConfig) {
    this.supabase = supabase;
    this.config = config;
  }

  /**
   * Evaluates the bucket state using a single atomic RPC call.
   */
  async allow(key: string, path: string): Promise<RateLimitResult> {
    const now = new Date();
    
    try {
      // Execute the atomic Token Bucket logic in Postgres
      const { data, error } = await this.supabase.rpc('check_rate_limit', {
        p_key: key,
        p_path: path,
        p_capacity: this.config.capacity,
        p_refill_rate: this.config.refill_rate_per_sec
      });

      if (error) {
        console.error(`[RateLimiter] RPC error for ${key}/${path}:`, error);
        return { 
          allowed: true, 
          remaining: 1, 
          limit: this.config.capacity, 
          resetAt: new Date(now.getTime() + 60000).toISOString() 
        }; // Fail open
      }

      return {
        allowed:   data.allowed,
        remaining: data.remaining,
        limit:     data.limit,
        resetAt:   data.reset_at
      };

    } catch (err) {
      console.error(`[RateLimiter] Unexpected error:`, err);
      return { 
        allowed: true, 
        remaining: 1, 
        limit: this.config.capacity, 
        resetAt: new Date(now.getTime() + 60000).toISOString() 
      }; // Fail open
    }
  }
}
