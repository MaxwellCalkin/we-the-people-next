// lib/ballot-quota.ts — protects the shared, free Google Civic quota.
//
// Address lookups are uncached by design (addresses are private), so each one
// costs a provider request: throttle them per client and per server instance.
// The election list is identical for everyone and holds no personal data, so
// it is cached briefly instead of fetched on every Elections page view.
// These in-memory guards blunt bursts and scripted abuse on each instance;
// they complement, not replace, a quota cap on the Google Cloud project.
import { createRateLimiter } from "@/lib/rate-limit";
import { getBallotElections } from "@/lib/ballot-provider";
import type { BallotElectionsResponse } from "@/lib/ballot-types";

interface Limit {
  max: number;
  windowMs: number;
}

export const DEFAULT_LIMITS = {
  perClient: { max: 10, windowMs: 10 * 60 * 1000 },
  global: { max: 500, windowMs: 60 * 60 * 1000 },
} satisfies Record<string, Limit>;

/** The caller's IP as reported by the hosting proxy, or "unknown". */
export function clientIdentifier(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

export type LookupDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function createLookupThrottle(limits: { perClient: Limit; global: Limit } = DEFAULT_LIMITS) {
  const perClient = createRateLimiter(limits.perClient.max, limits.perClient.windowMs);
  const global = createRateLimiter(limits.global.max, limits.global.windowMs);
  return {
    check(headers: Headers, now = Date.now()): LookupDecision {
      const client = perClient.check(clientIdentifier(headers), now);
      if (!client.success) return { allowed: false, retryAfterSeconds: Math.ceil(client.retryAfterMs / 1000) };
      const all = global.check("all", now);
      if (!all.success) return { allowed: false, retryAfterSeconds: Math.ceil(all.retryAfterMs / 1000) };
      return { allowed: true };
    },
    reset() {
      perClient.reset();
      global.reset();
    },
  };
}

export const ballotLookupThrottle = createLookupThrottle();

const READY_TTL_MS = 10 * 60 * 1000;
const FAILED_TTL_MS = 60 * 1000;

export function createElectionsCache(load: () => Promise<BallotElectionsResponse> = () => getBallotElections()) {
  let entry: { value: BallotElectionsResponse; expires: number } | null = null;
  return {
    async get(now = Date.now()): Promise<BallotElectionsResponse> {
      if (entry && entry.expires > now) return entry.value;
      const value = await load();
      // Keep failures briefly so an outage isn't hammered, but retry soon.
      entry = { value, expires: now + (value.status === "unavailable" ? FAILED_TTL_MS : READY_TTL_MS) };
      return value;
    },
    reset() {
      entry = null;
    },
  };
}

export const ballotElectionsCache = createElectionsCache();
