import "server-only";

/**
 * Best-effort, in-memory, per-instance rate limiter.
 *
 * IMPORTANT LIMITATION: on serverless hosting (Vercel, etc.) each function
 * instance has its own memory, so this does NOT enforce a global limit
 * across all instances — a burst of requests can land on different cold
 * instances and each gets its own quota. It still meaningfully blunts
 * naive/scripted abuse from a single client hitting a single warm
 * instance. For a hard guarantee, put a real distributed limiter (e.g.
 * Upstash Redis) in front instead — this is a pragmatic default that
 * requires no extra service to run.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

/** Best-effort client identifier from standard proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
