/**
 * Simple in-memory sliding-window rate limiter.
 *
 * On Vercel serverless this only limits within a single function
 * instance lifetime — good enough to stop casual abuse and burst
 * attacks. For heavier protection Vercel's WAF / Cloudflare is
 * the production answer.
 */

const store = new Map<string, number[]>();

// Clean up old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, timestamps] of store.entries()) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) {
      store.delete(key);
    } else {
      store.set(key, valid);
    }
  }
}

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
};

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  cleanup(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = store.get(key) ?? [];
  const valid = timestamps.filter((t) => t > cutoff);

  if (valid.length >= maxRequests) {
    const oldestValid = valid[0];
    const resetInSeconds = Math.ceil(
      (oldestValid + windowMs - now) / 1000
    );
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  valid.push(now);
  store.set(key, valid);

  return {
    allowed: true,
    remaining: maxRequests - valid.length,
    resetInSeconds: Math.ceil(windowMs / 1000),
  };
}
