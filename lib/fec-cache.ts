// lib/fec-cache.ts
//
// Cache-aware loader for FEC campaign finance data. The orchestration logic
// (`loadCachedFinance`) is kept storage-agnostic via a small interface so it
// can be unit-tested with an in-memory store. The Mongo-backed implementation
// (`mongoFinanceStore`) is a thin shell over models/FecCache.
//
// We cache for 24h. Negative results (no data) are cached too — otherwise we
// would re-hit OpenFEC on every request for members with no filings, which
// is the worst case for rate limiting.

import FecCache from "@/models/FecCache";
import {
  getCandidateTotals,
  getTopIndividualContributions,
  getTopPacContributions,
  type CandidateTotals,
  type ContributorAggregate,
} from "./fec";

export interface MemberFinance {
  totals: CandidateTotals | null;
  topIndividuals: ContributorAggregate[];
  topPacs: ContributorAggregate[];
}

export interface CachedFinanceRow extends MemberFinance {
  fetchedAt: Date;
}

/** Storage interface — small enough to fake in tests. */
export interface FinanceStore {
  load(bioguideId: string, cycle: number): Promise<CachedFinanceRow | null>;
  save(bioguideId: string, cycle: number, data: MemberFinance, ttlMs: number): Promise<void>;
}

/** Fetcher interface — wraps the live FEC API calls so tests can replace them. */
export interface FinanceFetcher {
  fetch(fecId: string, cycle: number): Promise<MemberFinance>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Pure orchestration: returns cached data when fresh, otherwise calls the
 * fetcher and writes the result back to the store. Always returns a result
 * (never throws on cache miss). If the fetcher itself throws, the error
 * propagates up so the caller can decide what to do.
 */
export async function loadCachedFinance(
  bioguideId: string,
  fecId: string,
  cycle: number,
  store: FinanceStore,
  fetcher: FinanceFetcher,
  ttlMs: number = DAY_MS,
  now: () => number = Date.now
): Promise<MemberFinance> {
  const cached = await store.load(bioguideId, cycle);
  if (cached && now() - cached.fetchedAt.getTime() < ttlMs) {
    return {
      totals: cached.totals,
      topIndividuals: cached.topIndividuals,
      topPacs: cached.topPacs,
    };
  }

  const fresh = await fetcher.fetch(fecId, cycle);
  await store.save(bioguideId, cycle, fresh, ttlMs);
  return fresh;
}

// ── Production implementations ──────────────────────────────────────

export const mongoFinanceStore: FinanceStore = {
  async load(bioguideId, cycle) {
    const doc = await FecCache.findOne({ bioguideId, cycle }).lean();
    if (!doc) return null;
    return {
      totals: doc.totals,
      topIndividuals: doc.topIndividuals || [],
      topPacs: doc.topPacs || [],
      fetchedAt: doc.fetchedAt,
    };
  },
  async save(bioguideId, cycle, data, ttlMs) {
    const now = new Date();
    await FecCache.updateOne(
      { bioguideId, cycle },
      {
        $set: {
          totals: data.totals,
          topIndividuals: data.topIndividuals,
          topPacs: data.topPacs,
          fetchedAt: now,
          expiresAt: new Date(now.getTime() + ttlMs),
        },
      },
      { upsert: true }
    );
  },
};

export const liveFecFetcher: FinanceFetcher = {
  async fetch(fecId, cycle) {
    const [totals, topIndividuals, topPacs] = await Promise.all([
      getCandidateTotals(fecId, cycle),
      getTopIndividualContributions(fecId, cycle, 5),
      getTopPacContributions(fecId, cycle, 5),
    ]);
    return { totals, topIndividuals, topPacs };
  },
};
