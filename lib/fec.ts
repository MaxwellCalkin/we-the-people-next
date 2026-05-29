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

/**
 * Independent expenditures — outside-group spending FOR or AGAINST a
 * candidate. This money is reported separately under Schedule E and never
 * touches the candidate's own committee, so it does NOT appear in
 * CandidateTotals.receipts. Super PACs and "dark money" 501(c)(4) groups
 * routinely outspend the candidate's own campaign here — surfacing it is
 * essential for an honest finance picture.
 */
export interface OutsideSpender {
  /** The committee that made the expenditure — typically a Super PAC name. */
  name: string;
  /** Total spent by this committee for/against the candidate in this cycle. */
  amount: number;
}

export interface OutsideSpending {
  supportTotal: number;
  opposeTotal: number;
  topSupporters: OutsideSpender[];
  topOpposers: OutsideSpender[];
}

export type FecOffice = "H" | "S" | "P";

export interface CandidateSummary {
  fecId: string;
  name: string;
  party: string | null;
  office: FecOffice;
  state: string;
  district: string | null;
  incumbentChallenge: "I" | "C" | "O" | null;
}

export interface CandidateBio {
  fecId: string;
  name: string;
  party: string | null;
  office: FecOffice;
  state: string;
  district: string | null;
  incumbentChallenge: "I" | "C" | "O" | null;
  candidateStatus: string | null;
  electionYears: number[];
  principalCommitteeIds: string[];
}

export type ElectionType = "primary" | "general" | "runoff" | "special" | "other";

export interface ElectionDate {
  state: string | null;
  office: FecOffice | null;
  district: string | null;
  party: string | null;
  type: ElectionType;
  date: string;
}

/** Errors thrown by the FEC client carry the HTTP status for caller handling. */
export class FecApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "FecApiError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type FecParamValue = string | number | string[] | undefined;

async function fecFetch<T>(path: string, params: Record<string, FecParamValue>): Promise<T> {
  const apiKey = process.env.FEC_API_KEY;
  if (!apiKey) throw new FecApiError("FEC_API_KEY not set", 0);

  const url = new URL(`${FEC_BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      // FEC list endpoints expect repeated query params for OR-style filters
      // (committee_id=A&committee_id=B), not comma-joined values — URLSearchParams
      // would percent-encode the commas otherwise.
      for (const item of v) {
        if (item !== undefined && item !== null && item !== "") {
          url.searchParams.append(k, String(item));
        }
      }
    } else {
      url.searchParams.set(k, String(v));
    }
  }
  const target = url.toString();

  // Retry once on 429 after a short delay. FEC's per-hour budget is generous
  // but bursts (parallel candidate lookups on a race page) can transiently
  // trip the per-second throttle.
  let resp = await fetch(target);
  if (resp.status === 429) {
    await sleep(1500);
    resp = await fetch(target);
  }
  if (!resp.ok) {
    throw new FecApiError(`FEC API ${resp.status} for ${path}`, resp.status);
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

export interface CandidateWithTotals {
  fecId: string;
  name: string;
  party: string | null;
  office: FecOffice;
  state: string;
  district: string | null;
  incumbentChallenge: "I" | "C" | "O" | null;
  totals: CandidateTotals | null;
}

interface CandidatesTotalsRow {
  candidate_id?: string;
  name?: string;
  party?: string | null;
  party_full?: string | null;
  office?: string;
  state?: string;
  district?: string | number | null;
  /**
   * /candidates/totals/ returns the single-character form ("I" / "C" / "O").
   * Some endpoints also expose the long form as a separate field; we parse
   * whichever is present so an FEC field-rename doesn't silently drop the
   * incumbent flag on race list pages.
   */
  incumbent_challenge?: string | null;
  incumbent_challenge_full?: string | null;
  receipts?: number;
  disbursements?: number;
  last_cash_on_hand_end_period?: number;
  individual_contributions?: number;
  other_political_committee_contributions?: number;
  coverage_end_date?: string;
  cycle?: number;
}

/**
 * Batched roster + totals for a race in a single FEC call. Replaces a fan-out
 * of N totals lookups with one /candidates/totals/ request. Filtered to
 * candidate_status=C (current candidate) and to the given election_year so
 * candidates running in other cycles for the same seat don't bleed in.
 */
export async function getRaceCandidatesWithTotals(opts: {
  state: string;
  office: FecOffice;
  district?: string | number;
  cycle: number;
  electionYear: number;
}): Promise<CandidateWithTotals[]> {
  const params: Record<string, string | number | undefined> = {
    state: opts.state,
    office: opts.office,
    cycle: opts.cycle,
    election_year: opts.electionYear,
    candidate_status: "C",
    per_page: 100,
  };
  if (opts.office === "H" && opts.district !== undefined) {
    params.district = String(opts.district).padStart(2, "0");
  }

  const data = await fecFetch<{ results: CandidatesTotalsRow[] }>(
    `/candidates/totals/`,
    params
  );

  return (data.results ?? [])
    .filter((r) => r.candidate_id && r.name)
    .map<CandidateWithTotals>((r) => {
      const longFormMap: Record<string, "I" | "C" | "O"> = {
        Incumbent: "I",
        Challenger: "C",
        "Open seat": "O",
      };
      const incumbentChallenge =
        normalizeChallenge(r.incumbent_challenge) ??
        (r.incumbent_challenge_full
          ? longFormMap[r.incumbent_challenge_full] ?? null
          : null);

      const hasAnyTotals =
        r.receipts !== undefined ||
        r.disbursements !== undefined ||
        r.last_cash_on_hand_end_period !== undefined;

      return {
        fecId: r.candidate_id as string,
        name: r.name as string,
        party: r.party_full ?? r.party ?? null,
        office: normalizeOffice(r.office) ?? opts.office,
        state: r.state ?? opts.state,
        district:
          opts.office === "H" ? normalizeDistrict(r.district) : null,
        incumbentChallenge,
        totals: hasAnyTotals
          ? {
              candidateId: r.candidate_id as string,
              cycle: r.cycle ?? opts.cycle,
              receipts: r.receipts ?? 0,
              disbursements: r.disbursements ?? 0,
              cashOnHand: r.last_cash_on_hand_end_period ?? 0,
              individualContributions: r.individual_contributions ?? 0,
              pacContributions: r.other_political_committee_contributions ?? 0,
              coverageEndDate: r.coverage_end_date ?? null,
            }
          : null,
      };
    });
}

interface CandidatesListRow {
  candidate_id?: string;
  name?: string;
  party?: string | null;
  party_full?: string | null;
  office?: string;
  state?: string;
  district?: string | number | null;
  incumbent_challenge?: string | null;
  candidate_status?: string | null;
  election_years?: number[];
  principal_committees?: { committee_id: string }[];
}

interface ScheduleERow {
  candidate_id?: string;
  /** The committee that MADE the expenditure (e.g. a Super PAC). */
  committee_id?: string;
  /** Who the committee paid (typically an ad firm or media buyer, NOT the spender). */
  payee_name?: string;
  support_oppose_indicator?: "S" | "O" | string;
  expenditure_amount?: number;
}

interface CommitteeLookupRow {
  committee_id?: string;
  name?: string;
}

async function fetchCommitteeNames(
  committeeIds: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (committeeIds.length === 0) return result;
  const data = await fecFetch<{ results: CommitteeLookupRow[] }>(
    `/committees/`,
    {
      committee_id: committeeIds,
      per_page: Math.max(committeeIds.length, 20),
    }
  );
  for (const c of data.results ?? []) {
    if (c.committee_id && c.name) result.set(c.committee_id, c.name);
  }
  return result;
}

/**
 * Outside spending FOR and AGAINST a candidate. Reads from FEC Schedule E.
 *
 * Approach: fetch up to 200 of the largest individual expenditures (2 pages
 * of 100 sorted by amount desc), then compute BOTH headline totals AND the
 * top-groups lists from the same records. Using a single source of truth
 * avoids the contradictions we hit when mixing the /by_candidate/ aggregate
 * with per-record data (the aggregate sometimes lags or filters by election
 * sub-cycle while the per-record data does not).
 *
 * Trade-off: totals may slightly undercount if there's a long tail of small
 * expenditures beyond record 200, but in practice schedule_e is dominated by
 * a handful of large media buys per committee, so 200 records capture nearly
 * all of the dollar value for any contested race.
 */
export async function getOutsideSpending(
  candidateId: string,
  cycle: number
): Promise<OutsideSpending> {
  const PAGE_SIZE = 100;
  const MAX_PAGES = 2;

  type ScheduleEResp = {
    results: ScheduleERow[];
    pagination?: { pages?: number };
  };

  const records: ScheduleERow[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const resp = await fecFetch<ScheduleEResp>(`/schedules/schedule_e/`, {
      candidate_id: candidateId,
      cycle,
      sort: "-expenditure_amount",
      sort_hide_null: "true",
      per_page: PAGE_SIZE,
      page,
    });
    const batch = resp.results ?? [];
    records.push(...batch);
    const totalPages = resp.pagination?.pages ?? 1;
    if (batch.length < PAGE_SIZE || page >= totalPages) break;
  }

  // Aggregate by the SPENDER's committee_id, not the payee name. Schedule E
  // records the recipient (vendor) as payee_name — that's an ad firm or media
  // buyer, not the actual political committee doing the spending.
  let supportTotal = 0;
  let opposeTotal = 0;
  const supportByCommitteeId = new Map<string, number>();
  const opposeByCommitteeId = new Map<string, number>();
  for (const row of records) {
    const cid = row.committee_id;
    const amt = row.expenditure_amount;
    if (!cid || typeof amt !== "number") continue;
    if (row.support_oppose_indicator === "S") {
      supportTotal += amt;
      supportByCommitteeId.set(cid, (supportByCommitteeId.get(cid) ?? 0) + amt);
    } else if (row.support_oppose_indicator === "O") {
      opposeTotal += amt;
      opposeByCommitteeId.set(cid, (opposeByCommitteeId.get(cid) ?? 0) + amt);
    }
  }

  const topSupporterEntries = [...supportByCommitteeId.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topOpposerEntries = [...opposeByCommitteeId.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // One additional batched call to resolve committee_id → human-readable name.
  // Failures here degrade gracefully — we fall back to the raw committee_id
  // rather than 404-ing the whole panel.
  const idsToLookUp = [
    ...new Set([
      ...topSupporterEntries.map(([id]) => id),
      ...topOpposerEntries.map(([id]) => id),
    ]),
  ];
  let nameByCommitteeId = new Map<string, string>();
  try {
    nameByCommitteeId = await fetchCommitteeNames(idsToLookUp);
  } catch (e) {
    console.error("Committee name lookup failed for outside spending", e);
  }

  const resolve = (entries: [string, number][]): OutsideSpender[] =>
    entries.map(([id, amount]) => ({
      name: nameByCommitteeId.get(id) ?? id,
      amount,
    }));

  return {
    supportTotal,
    opposeTotal,
    topSupporters: resolve(topSupporterEntries),
    topOpposers: resolve(topOpposerEntries),
  };
}

function normalizeOffice(o: string | undefined): FecOffice | null {
  if (o === "H" || o === "S" || o === "P") return o;
  return null;
}

function normalizeDistrict(d: string | number | null | undefined): string | null {
  if (d === null || d === undefined || d === "") return null;
  return String(d).padStart(2, "0");
}

function normalizeChallenge(c: string | null | undefined): "I" | "C" | "O" | null {
  if (c === "I" || c === "C" || c === "O") return c;
  return null;
}

/**
 * List federal candidates for a given race. For Senate or Presidential races
 * omit `district`. `electionYear` filters to candidates running in that year
 * (a candidate may have filed for multiple cycles — this nails down 2026).
 */
export async function getCandidatesByOffice(opts: {
  state: string;
  office: FecOffice;
  district?: string | number;
  cycle: number;
  electionYear: number;
}): Promise<CandidateSummary[]> {
  const params: Record<string, string | number | undefined> = {
    state: opts.state,
    office: opts.office,
    cycle: opts.cycle,
    election_year: opts.electionYear,
    candidate_status: "C",
    per_page: 100,
  };
  if (opts.office === "H" && opts.district !== undefined) {
    params.district = String(opts.district).padStart(2, "0");
  }

  const data = await fecFetch<{ results: CandidatesListRow[] }>(
    `/candidates/`,
    params
  );

  return (data.results ?? [])
    .filter((r) => r.candidate_id && r.name)
    .map<CandidateSummary>((r) => ({
      fecId: r.candidate_id as string,
      name: r.name as string,
      party: r.party_full ?? r.party ?? null,
      office: normalizeOffice(r.office) ?? opts.office,
      state: r.state ?? opts.state,
      district: opts.office === "H" ? normalizeDistrict(r.district) : null,
      incumbentChallenge: normalizeChallenge(r.incumbent_challenge),
    }));
}

/**
 * Full candidate detail by FEC ID. Returns null if FEC has no record.
 */
export async function getCandidateDetail(fecId: string): Promise<CandidateBio | null> {
  const data = await fecFetch<{ results: CandidatesListRow[] }>(
    `/candidate/${fecId}/`,
    { per_page: 1 }
  );
  const r = data.results?.[0];
  if (!r || !r.candidate_id || !r.name) return null;

  const office = normalizeOffice(r.office) ?? "H";
  return {
    fecId: r.candidate_id,
    name: r.name,
    party: r.party_full ?? r.party ?? null,
    office,
    state: r.state ?? "",
    district: office === "H" ? normalizeDistrict(r.district) : null,
    incumbentChallenge: normalizeChallenge(r.incumbent_challenge),
    candidateStatus: r.candidate_status ?? null,
    electionYears: r.election_years ?? [],
    principalCommitteeIds: (r.principal_committees ?? [])
      .map((c) => c.committee_id)
      .filter(Boolean),
  };
}

interface ElectionDateRow {
  election_state?: string | null;
  election_district?: string | number | null;
  election_party?: string | null;
  office_sought?: string | null;
  election_type_id?: string | null;
  election_date?: string | null;
}

const ELECTION_TYPE_MAP: Record<string, ElectionType> = {
  G: "general",
  P: "primary",
  PR: "primary",
  PP: "primary",
  R: "runoff",
  SG: "special",
  SP: "special",
  SR: "runoff",
};

/**
 * Federal election dates. Without `state`, returns nationwide dates (general
 * + all state primaries / runoffs). Sorted ascending by date. Past dates are
 * not filtered out — callers decide the display window.
 */
export async function getElectionDates(opts: {
  state?: string;
  electionYear: number;
}): Promise<ElectionDate[]> {
  const params: Record<string, string | number | undefined> = {
    election_year: opts.electionYear,
    sort: "election_date",
    per_page: 100,
  };
  if (opts.state) params.election_state = opts.state;

  const data = await fecFetch<{ results: ElectionDateRow[] }>(
    `/election-dates/`,
    params
  );

  return (data.results ?? [])
    .filter((r) => r.election_date)
    .map<ElectionDate>((r) => ({
      state: r.election_state ?? null,
      office: normalizeOffice(r.office_sought ?? undefined),
      district: normalizeDistrict(r.election_district ?? null),
      party: r.election_party ?? null,
      type: ELECTION_TYPE_MAP[r.election_type_id ?? ""] ?? "other",
      date: r.election_date as string,
    }));
}
