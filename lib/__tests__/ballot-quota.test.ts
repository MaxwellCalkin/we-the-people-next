import { describe, expect, it, vi } from "vitest";
import { clientIdentifier, createElectionsCache, createLookupThrottle } from "@/lib/ballot-quota";

vi.mock("@/lib/ballot-provider", () => ({ getBallotElections: vi.fn() }));

const from = (ip: string) => new Headers({ "x-forwarded-for": `${ip}, 10.0.0.1` });
const minute = 60 * 1000;

describe("clientIdentifier", () => {
  it("uses the first forwarded address, then x-real-ip, then a shared bucket", () => {
    expect(clientIdentifier(from("203.0.113.5"))).toBe("203.0.113.5");
    expect(clientIdentifier(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(clientIdentifier(new Headers())).toBe("unknown");
  });
});

describe("ballot lookup throttle", () => {
  const limits = { perClient: { max: 3, windowMs: 10 * minute }, global: { max: 5, windowMs: 60 * minute } };

  it("stops one client after its limit and says when to retry", () => {
    const throttle = createLookupThrottle(limits);
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) expect(throttle.check(from("203.0.113.5"), now).allowed).toBe(true);
    expect(throttle.check(from("203.0.113.5"), now + 2 * minute)).toEqual({ allowed: false, retryAfterSeconds: 480 });
  });

  it("keeps serving other clients while one is limited", () => {
    const throttle = createLookupThrottle(limits);
    for (let i = 0; i < 4; i++) throttle.check(from("203.0.113.5"));
    expect(throttle.check(from("198.51.100.7")).allowed).toBe(true);
  });

  it("allows a limited client again once its window passes", () => {
    const throttle = createLookupThrottle(limits);
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) throttle.check(from("203.0.113.5"), now);
    expect(throttle.check(from("203.0.113.5"), now + 10 * minute).allowed).toBe(true);
  });

  it("caps total lookups across all clients to protect the shared quota", () => {
    const throttle = createLookupThrottle(limits);
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) expect(throttle.check(from(`203.0.113.${i}`), now).allowed).toBe(true);
    expect(throttle.check(from("198.51.100.7"), now)).toEqual({ allowed: false, retryAfterSeconds: 3600 });
  });
});

describe("election list cache", () => {
  it("serves one provider response to every visitor until it expires", async () => {
    const load = vi.fn().mockResolvedValue({ status: "ready", elections: [{ id: "9999", name: "General", date: "2026-11-03" }] });
    const cache = createElectionsCache(load);
    const now = 1_000_000;

    await cache.get(now);
    await cache.get(now + 9 * minute);
    expect(load).toHaveBeenCalledTimes(1);

    await cache.get(now + 10 * minute);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("retries an unavailable provider after a minute instead of caching the outage", async () => {
    const load = vi.fn().mockResolvedValue({ status: "unavailable", elections: [], message: "Down" });
    const cache = createElectionsCache(load);
    const now = 1_000_000;

    await cache.get(now);
    await cache.get(now + 30 * 1000);
    expect(load).toHaveBeenCalledTimes(1);

    await cache.get(now + minute);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
