// lib/election-cache.ts
//
// Cache-aware loaders for the elections feature. Mirrors lib/fec-cache.ts:
// each loader is parameterized over a storage interface and a fetcher
// interface so the orchestration logic is testable in-memory.
//
// Three caches: per-candidate finance, per-race roster, per-scope dates.
// All follow the same shape: load → if fresh, return; else fetch → write
// back → return.

import CandidateFinanceCache from "@/models/CandidateFinanceCache";
import ElectionRosterCache, {
  type IRosterCandidate,
} from "@/models/ElectionRosterCache";
import ElectionDatesCache from "@/models/ElectionDatesCache";
import {
  getCandidateTotals,
  getCandidatesByOffice,
  getElectionDates,
  getOutsideSpending,
  getTopIndividualContributions,
  getTopPacContributions,
  type CandidateSummary,
  type CandidateTotals,
  type ContributorAggregate,
  type ElectionDate,
  type FecOffice,
  type OutsideSpending,
} from "./fec";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// ── Candidate finance ──────────────────────────────────────────────────

export interface CandidateFinance {
  totals: CandidateTotals | null;
  topIndividuals: ContributorAggregate[];
  topPacs: ContributorAggregate[];
  outsideSpending: OutsideSpending | null;
}

export interface CachedCandidateFinance extends CandidateFinance {
  hasFullDetails: boolean;
  fetchedAt: Date;
}

export interface CandidateFinanceStore {
  load(fecId: string, cycle: number): Promise<CachedCandidateFinance | null>;
  save(
    fecId: string,
    cycle: number,
    data: CandidateFinance,
    hasFullDetails: boolean,
    ttlMs: number
  ): Promise<void>;
}

export interface CandidateFinanceFetcher {
  fetch(fecId: string, cycle: number): Promise<CandidateFinance>;
}

/**
 * Full finance load — totals + top individuals + top PACs. ~5 FEC API calls
 * per candidate. Use only on the candidate detail page. Re-fetches when the
 * cached row was populated via the totals-only path (hasFullDetails=false).
 */
export async function loadCandidateFinance(
  fecId: string,
  cycle: number,
  store: CandidateFinanceStore,
  fetcher: CandidateFinanceFetcher,
  ttlMs: number = DAY_MS,
  now: () => number = Date.now
): Promise<CandidateFinance> {
  const cached = await store.load(fecId, cycle);
  const fresh =
    cached &&
    cached.hasFullDetails &&
    now() - cached.fetchedAt.getTime() < ttlMs;
  if (fresh && cached) {
    return {
      totals: cached.totals,
      topIndividuals: cached.topIndividuals,
      topPacs: cached.topPacs,
      outsideSpending: cached.outsideSpending,
    };
  }
  const data = await fetcher.fetch(fecId, cycle);
  await store.save(fecId, cycle, data, true, ttlMs);
  return data;
}

/**
 * Totals-only load — single FEC call per candidate (vs ~5 for the full
 * load). Used by race list pages where we only display Raised + Cash on Hand.
 * Returns just the totals; any cached value (totals-only OR full) is reused
 * since totals are present either way.
 */
export async function loadCandidateTotals(
  fecId: string,
  cycle: number,
  store: CandidateFinanceStore,
  fetcher: CandidateTotalsFetcher,
  ttlMs: number = DAY_MS,
  now: () => number = Date.now
): Promise<CandidateTotals | null> {
  const cached = await store.load(fecId, cycle);
  if (cached && now() - cached.fetchedAt.getTime() < ttlMs) {
    return cached.totals;
  }
  const totals = await fetcher.fetch(fecId, cycle);
  await store.save(
    fecId,
    cycle,
    { totals, topIndividuals: [], topPacs: [], outsideSpending: null },
    false,
    ttlMs
  );
  return totals;
}

export interface CandidateTotalsFetcher {
  fetch(fecId: string, cycle: number): Promise<CandidateTotals | null>;
}

export const mongoCandidateFinanceStore: CandidateFinanceStore = {
  async load(fecId, cycle) {
    const doc = await CandidateFinanceCache.findOne({ fecId, cycle }).lean();
    if (!doc) return null;
    return {
      totals: doc.totals,
      topIndividuals: doc.topIndividuals || [],
      topPacs: doc.topPacs || [],
      outsideSpending: doc.outsideSpending ?? null,
      hasFullDetails: doc.hasFullDetails ?? false,
      fetchedAt: doc.fetchedAt,
    };
  },
  async save(fecId, cycle, data, hasFullDetails, ttlMs) {
    const now = new Date();
    await CandidateFinanceCache.updateOne(
      { fecId, cycle },
      {
        $set: {
          totals: data.totals,
          topIndividuals: data.topIndividuals,
          topPacs: data.topPacs,
          outsideSpending: data.outsideSpending,
          hasFullDetails,
          fetchedAt: now,
          expiresAt: new Date(now.getTime() + ttlMs),
        },
      },
      { upsert: true }
    );
  },
};

export const liveCandidateFinanceFetcher: CandidateFinanceFetcher = {
  async fetch(fecId, cycle) {
    // Outside spending is wrapped separately so a Schedule E failure doesn't
    // block the rest of the finance card from rendering.
    const [totals, topIndividuals, topPacs, outsideSpending] = await Promise.all([
      getCandidateTotals(fecId, cycle),
      getTopIndividualContributions(fecId, cycle, 5),
      getTopPacContributions(fecId, cycle, 5),
      getOutsideSpending(fecId, cycle).catch((e) => {
        console.error("Outside spending lookup failed for", fecId, e);
        return null;
      }),
    ]);
    return { totals, topIndividuals, topPacs, outsideSpending };
  },
};

export const liveCandidateTotalsFetcher: CandidateTotalsFetcher = {
  async fetch(fecId, cycle) {
    return getCandidateTotals(fecId, cycle);
  },
};

// ── Roster ─────────────────────────────────────────────────────────────

export interface CachedRoster {
  candidates: IRosterCandidate[];
  fetchedAt: Date;
}

export interface RosterKey {
  state: string;
  office: FecOffice;
  district: string; // "" for S / P
  cycle: number;
}

export interface RosterStore {
  load(key: RosterKey): Promise<CachedRoster | null>;
  save(
    key: RosterKey,
    candidates: IRosterCandidate[],
    ttlMs: number
  ): Promise<void>;
}

export interface RosterFetcher {
  fetch(key: RosterKey, electionYear: number): Promise<CandidateSummary[]>;
}

export async function loadRoster(
  key: RosterKey,
  electionYear: number,
  store: RosterStore,
  fetcher: RosterFetcher,
  ttlMs: number = DAY_MS,
  now: () => number = Date.now
): Promise<IRosterCandidate[]> {
  const cached = await store.load(key);
  if (cached && now() - cached.fetchedAt.getTime() < ttlMs) {
    return cached.candidates;
  }
  const summaries = await fetcher.fetch(key, electionYear);
  const candidates: IRosterCandidate[] = summaries.map((s) => ({
    fecId: s.fecId,
    name: s.name,
    party: s.party,
    incumbentChallenge: s.incumbentChallenge,
  }));
  await store.save(key, candidates, ttlMs);
  return candidates;
}

export const mongoRosterStore: RosterStore = {
  async load({ state, office, district, cycle }) {
    const doc = await ElectionRosterCache.findOne({
      state,
      office,
      district,
      cycle,
    }).lean();
    if (!doc) return null;
    return { candidates: doc.candidates || [], fetchedAt: doc.fetchedAt };
  },
  async save({ state, office, district, cycle }, candidates, ttlMs) {
    const now = new Date();
    await ElectionRosterCache.updateOne(
      { state, office, district, cycle },
      {
        $set: {
          candidates,
          fetchedAt: now,
          expiresAt: new Date(now.getTime() + ttlMs),
        },
      },
      { upsert: true }
    );
  },
};

export const liveRosterFetcher: RosterFetcher = {
  async fetch(key, electionYear) {
    return getCandidatesByOffice({
      state: key.state,
      office: key.office,
      district: key.district || undefined,
      cycle: key.cycle,
      electionYear,
    });
  },
};

// ── Election dates ─────────────────────────────────────────────────────

export interface CachedDates {
  dates: ElectionDate[];
  fetchedAt: Date;
}

export interface DatesStore {
  load(scope: string, electionYear: number): Promise<CachedDates | null>;
  save(
    scope: string,
    electionYear: number,
    dates: ElectionDate[],
    ttlMs: number
  ): Promise<void>;
}

export interface DatesFetcher {
  fetch(scope: string, electionYear: number): Promise<ElectionDate[]>;
}

export async function loadElectionDates(
  scope: string,
  electionYear: number,
  store: DatesStore,
  fetcher: DatesFetcher,
  ttlMs: number = WEEK_MS,
  now: () => number = Date.now
): Promise<ElectionDate[]> {
  const cached = await store.load(scope, electionYear);
  if (cached && now() - cached.fetchedAt.getTime() < ttlMs) {
    return cached.dates;
  }
  const fresh = await fetcher.fetch(scope, electionYear);
  await store.save(scope, electionYear, fresh, ttlMs);
  return fresh;
}

export const mongoDatesStore: DatesStore = {
  async load(scope, electionYear) {
    const doc = await ElectionDatesCache.findOne({ scope, electionYear }).lean();
    if (!doc) return null;
    return { dates: doc.dates || [], fetchedAt: doc.fetchedAt };
  },
  async save(scope, electionYear, dates, ttlMs) {
    const now = new Date();
    await ElectionDatesCache.updateOne(
      { scope, electionYear },
      {
        $set: {
          dates,
          fetchedAt: now,
          expiresAt: new Date(now.getTime() + ttlMs),
        },
      },
      { upsert: true }
    );
  },
};

export const liveDatesFetcher: DatesFetcher = {
  async fetch(scope, electionYear) {
    return getElectionDates({
      state: scope === "national" ? undefined : scope,
      electionYear,
    });
  },
};
