const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}

/**
 * A fixed-window limiter with its own bucket store, for callers that need
 * their own limits, a retry time, or a reset between tests.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const buckets = new Map<string, { count: number; resetTime: number }>();
  return {
    check(key: string, now = Date.now()): { success: boolean; remaining: number; retryAfterMs: number } {
      const entry = buckets.get(key);
      if (!entry || now >= entry.resetTime) {
        buckets.set(key, { count: 1, resetTime: now + windowMs });
        return { success: true, remaining: limit - 1, retryAfterMs: 0 };
      }
      if (entry.count >= limit) {
        return { success: false, remaining: 0, retryAfterMs: entry.resetTime - now };
      }
      entry.count++;
      return { success: true, remaining: limit - entry.count, retryAfterMs: 0 };
    },
    reset() {
      buckets.clear();
    },
  };
}
