import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadCachedFinance,
  type FinanceStore,
  type FinanceFetcher,
  type MemberFinance,
  type CachedFinanceRow,
} from "../fec-cache";
import type { CandidateTotals, ContributorAggregate } from "../fec";

// In-memory store keyed by `${bioguideId}:${cycle}`. We use this instead of
// mocking Mongo (project rule: no DB mocks). Tests that touch this fake store
// are testing pure orchestration, not database behavior.
function makeMemoryStore(
  clock: () => number = Date.now
): FinanceStore & { _data: Map<string, CachedFinanceRow> } {
  const data = new Map<string, CachedFinanceRow>();
  return {
    _data: data,
    async load(bioguideId, cycle) {
      return data.get(`${bioguideId}:${cycle}`) ?? null;
    },
    async save(bioguideId, cycle, payload) {
      data.set(`${bioguideId}:${cycle}`, {
        ...payload,
        fetchedAt: new Date(clock()),
      });
    },
  };
}

function makeFetcher(payload: MemberFinance) {
  const fn = vi.fn().mockResolvedValue(payload);
  const fetcher: FinanceFetcher = { fetch: fn };
  return { fetcher, fn };
}

const sampleTotals: CandidateTotals = {
  candidateId: "S8WA00194",
  cycle: 2026,
  receipts: 100_000,
  disbursements: 50_000,
  cashOnHand: 50_000,
  individualContributions: 80_000,
  pacContributions: 20_000,
  coverageEndDate: "2026-03-31",
};

const sampleIndividuals: ContributorAggregate[] = [
  { contributor: "SMITH, JOHN", amount: 6600 },
];

const samplePacs: ContributorAggregate[] = [
  { contributor: "BIG PAC", amount: 5000 },
];

const samplePayload: MemberFinance = {
  totals: sampleTotals,
  topIndividuals: sampleIndividuals,
  topPacs: samplePacs,
};

beforeEach(() => {
  vi.useRealTimers();
});

describe("loadCachedFinance", () => {
  it("calls the fetcher and stores the result on a cache miss", async () => {
    const store = makeMemoryStore();
    const { fetcher, fn } = makeFetcher(samplePayload);

    const result = await loadCachedFinance("C000127", "S8WA00194", 2026, store, fetcher);

    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith("S8WA00194", 2026);
    expect(result).toEqual(samplePayload);
    expect(store._data.size).toBe(1);
  });

  it("returns cached data without calling the fetcher when fresh", async () => {
    const store = makeMemoryStore();
    const { fetcher, fn } = makeFetcher(samplePayload);

    // Prime the cache with one call
    await loadCachedFinance("C000127", "S8WA00194", 2026, store, fetcher);
    fn.mockClear();

    // Second call should hit the cache
    const result = await loadCachedFinance("C000127", "S8WA00194", 2026, store, fetcher);

    expect(fn).not.toHaveBeenCalled();
    expect(result).toEqual(samplePayload);
  });

  it("re-fetches when the cached entry is older than the TTL", async () => {
    let now = 1_000_000_000_000;
    const clock = () => now;
    const store = makeMemoryStore(clock);
    const { fetcher, fn } = makeFetcher(samplePayload);

    await loadCachedFinance("C000127", "S8WA00194", 2026, store, fetcher, 1000, clock);
    expect(fn).toHaveBeenCalledOnce();

    // Advance past TTL
    now += 1500;
    fn.mockClear();

    await loadCachedFinance("C000127", "S8WA00194", 2026, store, fetcher, 1000, clock);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("caches negative results so we don't keep hammering the API", async () => {
    const store = makeMemoryStore();
    const empty: MemberFinance = { totals: null, topIndividuals: [], topPacs: [] };
    const { fetcher, fn } = makeFetcher(empty);

    await loadCachedFinance("X000001", "X1XX00001", 2026, store, fetcher);
    await loadCachedFinance("X000001", "X1XX00001", 2026, store, fetcher);
    await loadCachedFinance("X000001", "X1XX00001", 2026, store, fetcher);

    expect(fn).toHaveBeenCalledOnce();
  });

  it("keys the cache by both bioguideId and cycle", async () => {
    const store = makeMemoryStore();
    const { fetcher, fn } = makeFetcher(samplePayload);

    await loadCachedFinance("C000127", "S8WA00194", 2026, store, fetcher);
    await loadCachedFinance("C000127", "S8WA00194", 2024, store, fetcher);
    await loadCachedFinance("A000055", "H6AL04098", 2026, store, fetcher);

    expect(fn).toHaveBeenCalledTimes(3);
    expect(store._data.size).toBe(3);
  });

  it("propagates fetcher errors and does not write to the cache", async () => {
    const store = makeMemoryStore();
    const fetcher: FinanceFetcher = {
      fetch: vi.fn().mockRejectedValue(new Error("FEC down")),
    };

    await expect(
      loadCachedFinance("C000127", "S8WA00194", 2026, store, fetcher)
    ).rejects.toThrow("FEC down");

    expect(store._data.size).toBe(0);
  });
});
