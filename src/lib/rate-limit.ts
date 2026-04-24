/**
 * In-memory fixed-window rate limiter for API routes.
 *
 * Suitable for single-instance or low-traffic serverless deployments:
 * each Node runtime instance keeps its own counter map. For a hardened
 * distributed setup (multiple Vercel regions, high traffic) swap this
 * for a Redis-backed limiter (e.g. @upstash/ratelimit).
 *
 * Each key gets `limit` requests per `windowMs` milliseconds. Keys are
 * evicted lazily when their window expires, so memory stays bounded as
 * long as callers don't create unbounded unique keys — always derive
 * the key from a stable identifier (user id, IP), not request content.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Cap map size as a belt-and-suspenders defense against memory growth
// if eviction ever fails to keep up. Oldest (by resetAt) evicted first.
const MAX_KEYS = 10_000;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    if (buckets.size > MAX_KEYS) evictOldest();
    return { allowed: true, remaining: limit - 1, resetAt: bucket.resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitResponseHeaders(result: RateLimitResult, limit: number) {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

function evictOldest() {
  let oldestKey: string | null = null;
  let oldestReset = Infinity;
  for (const [k, v] of buckets) {
    if (v.resetAt < oldestReset) {
      oldestReset = v.resetAt;
      oldestKey = k;
    }
  }
  if (oldestKey) buckets.delete(oldestKey);
}
