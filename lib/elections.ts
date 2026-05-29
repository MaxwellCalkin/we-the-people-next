// lib/elections.ts
//
// Higher-level orchestration for the elections feature pages.
//
// Race list pages use a single batched FEC call (/candidates/totals/) for the
// whole race — roster + totals together — instead of fanning out one totals
// lookup per candidate. This keeps a 15-candidate Senate race at exactly one
// FEC round-trip on a cold cache.

import ElectionRosterCache from "@/models/ElectionRosterCache";
import CandidateFinanceCache from "@/models/CandidateFinanceCache";
import MemberScore from "@/models/MemberScore";
import type { IRosterCandidate } from "@/models/ElectionRosterCache";
import {
  getRaceCandidatesWithTotals,
  type CandidateTotals,
  type FecOffice,
} from "./fec";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RaceCandidateWithFinance {
  candidate: IRosterCandidate;
  totals: CandidateTotals | null;
}

export interface SittingMember {
  bioguideId: string;
  name: string;
  party: string;
}

/**
 * Who currently holds a federal seat, according to Heard's own MemberScore
 * data (sourced from Congress.gov). Used to render "Currently held by X" on
 * race pages — works even when the sitting member hasn't filed for the
 * upcoming election yet (very common in primary season).
 *
 * For a Senate seat, returns at most one senator if exactly one matches the
 * (state, "Senate") shape. Each state has two senators; if both are returned
 * we cannot disambiguate which one's seat is on this cycle's ballot, so we
 * return null and let the page omit the line rather than guess.
 */
export async function getSittingMember(opts: {
  state: string;
  office: FecOffice;
  district?: string;
}): Promise<SittingMember | null> {
  try {
    if (opts.office === "H") {
      const districtNum = opts.district
        ? parseInt(opts.district, 10)
        : null;
      const doc = await MemberScore.findOne({
        state: opts.state,
        chamber: "House",
        $or: [
          { district: districtNum },
          ...(districtNum === 1 ? [{ district: null }] : []),
        ],
      })
        .select("bioguideId name party")
        .lean();
      return doc
        ? { bioguideId: doc.bioguideId, name: doc.name, party: doc.party }
        : null;
    }
    if (opts.office === "S") {
      const docs = await MemberScore.find({
        state: opts.state,
        chamber: "Senate",
      })
        .select("bioguideId name party")
        .lean();
      if (docs.length === 1) {
        const doc = docs[0];
        return { bioguideId: doc.bioguideId, name: doc.name, party: doc.party };
      }
      return null;
    }
    return null;
  } catch (e) {
    console.error("getSittingMember failed for", opts, e);
    return null;
  }
}

interface RaceKey {
  state: string;
  office: FecOffice;
  district: string;
  cycle: number;
}

/**
 * Reads the cached race totals if any candidate row in the per-candidate cache
 * is still fresh AND the roster is also fresh. Both must be cached to skip
 * the FEC call, since we need both names and totals.
 */
async function readCachedRace(
  key: RaceKey,
  ttlMs: number,
  nowMs: number
): Promise<RaceCandidateWithFinance[] | null> {
  const rosterDoc = await ElectionRosterCache.findOne({
    state: key.state,
    office: key.office,
    district: key.district,
    cycle: key.cycle,
  }).lean();

  if (!rosterDoc || nowMs - rosterDoc.fetchedAt.getTime() >= ttlMs) {
    return null;
  }
  if (!rosterDoc.candidates?.length) return [];

  const fecIds = rosterDoc.candidates.map((c) => c.fecId);
  const totalsDocs = await CandidateFinanceCache.find({
    fecId: { $in: fecIds },
    cycle: key.cycle,
  }).lean();

  if (totalsDocs.length !== fecIds.length) return null;
  const stale = totalsDocs.some(
    (d) => nowMs - d.fetchedAt.getTime() >= ttlMs
  );
  if (stale) return null;

  const totalsByFecId = new Map(totalsDocs.map((d) => [d.fecId, d.totals]));
  return rosterDoc.candidates.map((c) => ({
    candidate: c,
    totals: totalsByFecId.get(c.fecId) ?? null,
  }));
}

/**
 * Upserts the roster + per-candidate totals rows after a fresh batched fetch.
 * Per-candidate rows are stored with hasFullDetails=false so the candidate
 * detail page knows it still needs to fetch top donors/PACs.
 */
async function writeRaceCache(
  key: RaceKey,
  candidates: { fecId: string; name: string; party: string | null; incumbentChallenge: "I" | "C" | "O" | null; totals: CandidateTotals | null }[],
  ttlMs: number
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  const roster: IRosterCandidate[] = candidates.map((c) => ({
    fecId: c.fecId,
    name: c.name,
    party: c.party,
    incumbentChallenge: c.incumbentChallenge,
  }));

  await ElectionRosterCache.updateOne(
    { state: key.state, office: key.office, district: key.district, cycle: key.cycle },
    { $set: { candidates: roster, fetchedAt: now, expiresAt } },
    { upsert: true }
  );

  if (candidates.length === 0) return;

  const ops = candidates.map((c) => ({
    updateOne: {
      filter: { fecId: c.fecId, cycle: key.cycle },
      update: {
        $set: {
          totals: c.totals,
          fetchedAt: now,
          expiresAt,
        },
        $setOnInsert: {
          topIndividuals: [],
          topPacs: [],
          hasFullDetails: false,
        },
      },
      upsert: true,
    },
  }));
  await CandidateFinanceCache.bulkWrite(ops);
}

/**
 * Loads a race's roster + per-candidate totals using a single batched FEC
 * call. Both layers of cache (roster + per-candidate finance) are populated
 * from the same response so subsequent visits — including candidate detail
 * pages, which look up per-candidate totals — start warm.
 */
export async function loadRaceCandidatesWithFinance(opts: {
  state: string;
  office: FecOffice;
  district?: string;
  cycle: number;
  electionYear?: number;
}): Promise<RaceCandidateWithFinance[]> {
  const key: RaceKey = {
    state: opts.state,
    office: opts.office,
    district: opts.district ?? "",
    cycle: opts.cycle,
  };

  const ttlMs = DAY_MS;
  const cached = await readCachedRace(key, ttlMs, Date.now());
  if (cached) return cached;

  const electionYear = opts.electionYear ?? opts.cycle;
  let batched;
  try {
    batched = await getRaceCandidatesWithTotals({
      state: opts.state,
      office: opts.office,
      district: opts.district || undefined,
      cycle: opts.cycle,
      electionYear,
    });
  } catch (e) {
    console.error("Batched totals fetch failed for", key, e);
    return [];
  }

  await writeRaceCache(key, batched, ttlMs).catch((e) => {
    console.error("Failed to write race cache for", key, e);
  });

  return batched.map((b) => ({
    candidate: {
      fecId: b.fecId,
      name: b.name,
      party: b.party,
      incumbentChallenge: b.incumbentChallenge,
    },
    totals: b.totals,
  }));
}
