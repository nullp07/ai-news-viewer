/**
 * Tiny in-memory token bucket per (route, key). Survives within a single
 * Node.js process — fine for `next dev` and good enough for low-traffic
 * Vercel deployments where lambdas are sticky-warm. For high-traffic /
 * multi-region, swap the storage layer for Upstash Ratelimit or similar.
 *
 * Buckets refill at `tokensPerInterval` over `intervalMs`. Each request takes
 * one token. When empty, `check()` returns `{ ok: false, retryAfter }`.
 */

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodic GC so the map doesn't grow unbounded.
let _gcStarted = false;
function startGc() {
  if (_gcStarted) return;
  _gcStarted = true;
  if (typeof setInterval === "undefined") return;
  setInterval(() => {
    const cutoff = Date.now() - 10 * 60_000;
    for (const [k, v] of buckets) {
      if (v.updatedAt < cutoff) buckets.delete(k);
    }
  }, 60_000).unref?.();
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the next token is available (when ok=false). */
  retryAfter: number;
  /** Tokens remaining after this call. */
  remaining: number;
}

export interface RateLimitOptions {
  /** Logical bucket name (route id). */
  scope: string;
  /** The thing we're limiting — usually IP. */
  key: string;
  tokensPerInterval: number;
  intervalMs: number;
}

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  startGc();
  const id = `${opts.scope}:${opts.key}`;
  const now = Date.now();
  const refillRate = opts.tokensPerInterval / opts.intervalMs; // tokens per ms

  const existing = buckets.get(id);
  let tokens: number;
  if (!existing) {
    tokens = opts.tokensPerInterval;
  } else {
    const elapsed = now - existing.updatedAt;
    tokens = Math.min(
      opts.tokensPerInterval,
      existing.tokens + elapsed * refillRate,
    );
  }

  if (tokens < 1) {
    const retryAfter = Math.ceil((1 - tokens) / refillRate / 1000);
    buckets.set(id, { tokens, updatedAt: now });
    return { ok: false, retryAfter: Math.max(retryAfter, 1), remaining: 0 };
  }

  tokens -= 1;
  buckets.set(id, { tokens, updatedAt: now });
  return { ok: true, retryAfter: 0, remaining: Math.floor(tokens) };
}

/**
 * Best-effort client identifier. Prefers `x-forwarded-for` (Vercel sets this),
 * falls back to a static "anon" so dev still works without proxy headers.
 */
export function clientKey(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "anon";
}
