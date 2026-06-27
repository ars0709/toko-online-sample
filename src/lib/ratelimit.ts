import { redis } from "./redis";

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch seconds when the window resets
  retryAfter: number; // seconds
};

/**
 * Fixed-window rate limiter backed by Redis. Simple, atomic (INCR), and good
 * enough for per-IP / per-key throttling.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const redisKey = `rl:${key}:${bucket}`;
  const count = await redis.incr(redisKey);
  if (count === 1) await redis.expire(redisKey, windowSeconds);
  const reset = (bucket + 1) * windowSeconds;
  const remaining = Math.max(0, limit - count);
  return {
    ok: count <= limit,
    limit,
    remaining,
    reset,
    retryAfter: count <= limit ? 0 : reset - Math.floor(Date.now() / 1000),
  };
}

export const RATE_TIERS: Record<string, { limit: number; window: number }> = {
  default: { limit: 120, window: 60 },
  generous: { limit: 600, window: 60 },
  auth: { limit: 10, window: 60 },
  checkout: { limit: 20, window: 60 },
};
