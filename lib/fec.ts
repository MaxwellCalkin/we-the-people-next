// lib/fec.ts
//
// Thin client for the OpenFEC API (api.open.fec.gov). U.S. government work,
// public domain. Free key from https://api.data.gov/signup/. Standard rate
// limit: 1,000 requests/hour per key.
//
// Heard uses this to show campaign finance data on member profile pages.
// Map a member's bioguide → fecIds via models/LegislatorCrosswalk first.

const FEC_BASE = "https://api.open.fec.gov/v1";

/** Current 2-year FEC election cycle. Cycles are even years. */
export function currentCycle(): number {
  const year = new Date().getFullYear();
  return year % 2 === 0 ? year : year + 1;
}

export interface CandidateTotals {
  candidateId: string;
  cycle: number;
  receipts: number;
  disbursements: number;
  cashOnHand: number;
  individualContributions: number;
  pacContributions: number;
  coverageEndDate: string | null;
}

export interface ContributorAggregate {
  contributor: string;
  amount: number;
}

/** Errors thrown by the FEC client carry the HTTP status for caller handling. */
export class FecApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "FecApiError";
  }
}

async function fecFetch<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const apiKey = process.env.FEC_API_KEY;
  if (!apiKey) throw new FecApiError("FEC_API_KEY not set", 0);

  const url = new URL(`${FEC_BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const resp = await fetch(url.toString());
  if (!resp.ok) {
    throw new FecApiError(
      `FEC API ${resp.status} for ${path}`,
      resp.status
    );
  }
  return (await resp.json()) as T;
}

/**
 * Look up cycle-level totals (receipts, cash on hand, etc.) for a candidate.
 * Returns null if no totals exist for that cycle (newer candidates, or
 * candidates who didn't file in that cycle).
 */
export async function getCandidateTotals(
  candidateId: string,
  cycle: number
): Promise<CandidateTotals | null> {
  interface TotalsResult {
    candidate_id: string;
    cycle: number;
    receipts?: number;
    disbursements?: number;
    last_cash_on_hand_end_period?: number;
    individual_contributions?: number;
    other_political_committee_contributions?: number;
    coverage_end_date?: string;
  }
  const data = await fecFetch<{ results: TotalsResult[] }>(
    `/candidate/${candidateId}/totals/`,
    { cycle, per_page: 1 }
  );

  const r = data.results?.[0];
  if (!r) return null;

  return {
    candidateId,
    cycle,
    receipts: r.receipts ?? 0,
    disbursements: r.disbursements ?? 0,
    cashOnHand: r.last_cash_on_hand_end_period ?? 0,
    individualContributions: r.individual_contributions ?? 0,
    pacContributions: r.other_political_committee_contributions ?? 0,
    coverageEndDate: r.coverage_end_date ?? null,
  };
}

/**
 * Get the candidate's principal committee IDs for a cycle. Needed because
 * Schedule A aggregations are keyed by committee, not candidate.
 */
async function getPrincipalCommitteeIds(candidateId: string, cycle: number): Promise<string[]> {
  interface CommitteeResult {
    committee_id: string;
    designation?: string;
  }
  const data = await fecFetch<{ results: CommitteeResult[] }>(
    `/candidate/${candidateId}/committees/`,
    { cycle, designation: "P", per_page: 20 }
  );
  return (data.results ?? []).map((c) => c.committee_id).filter(Boolean);
}

/**
 * Top individual donors by total amount given to the candidate's principal
 * committee(s) in the given cycle. Aggregated server-side via Schedule A's
 * by_size endpoint won't tell us names — for that we use schedule_a sorted
 * by contribution_receipt_amount.
 *
 * NOTE: this returns the largest *single* contributions in the cycle, not
 * lifetime aggregates by donor. The OpenFEC aggregation endpoints don't
 * expose per-donor name rollups via JSON, so this is the best we can do
 * without ingesting bulk data ourselves.
 */
export async function getTopIndividualContributions(
  candidateId: string,
  cycle: number,
  limit = 5
): Promise<ContributorAggregate[]> {
  const committeeIds = await getPrincipalCommitteeIds(candidateId, cycle);
  if (committeeIds.length === 0) return [];

  interface ScheduleAResult {
    contributor_name?: string;
    contribution_receipt_amount?: number;
  }
  const data = await fecFetch<{ results: ScheduleAResult[] }>(
    `/schedules/schedule_a/`,
    {
      committee_id: committeeIds.join(","),
      two_year_transaction_period: cycle,
      sort: "-contribution_receipt_amount",
      sort_hide_null: "true",
      per_page: limit,
      is_individual: "true",
    }
  );

  return (data.results ?? [])
    .filter((r) => r.contributor_name && r.contribution_receipt_amount)
    .map((r) => ({
      contributor: r.contributor_name as string,
      amount: r.contribution_receipt_amount as number,
    }));
}

/**
 * Top PAC contributions to the candidate's principal committee(s) for a cycle.
 * Same caveat as individual contributions — these are largest single
 * contributions, not lifetime aggregates.
 */
export async function getTopPacContributions(
  candidateId: string,
  cycle: number,
  limit = 5
): Promise<ContributorAggregate[]> {
  const committeeIds = await getPrincipalCommitteeIds(candidateId, cycle);
  if (committeeIds.length === 0) return [];

  interface ScheduleAResult {
    contributor_name?: string;
    contribution_receipt_amount?: number;
  }
  const data = await fecFetch<{ results: ScheduleAResult[] }>(
    `/schedules/schedule_a/`,
    {
      committee_id: committeeIds.join(","),
      two_year_transaction_period: cycle,
      sort: "-contribution_receipt_amount",
      sort_hide_null: "true",
      per_page: limit,
      is_individual: "false",
    }
  );

  return (data.results ?? [])
    .filter((r) => r.contributor_name && r.contribution_receipt_amount)
    .map((r) => ({
      contributor: r.contributor_name as string,
      amount: r.contribution_receipt_amount as number,
    }));
}
