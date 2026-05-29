// lib/crosswalk.ts
//
// Pure parsing logic for the unitedstates/congress-legislators dataset.
// Extracted from the ingest script so it can be unit-tested without touching
// Mongo or the network.
//
// Also exports `findIncumbentByFecId` — the reverse direction of the standard
// bioguide→fecIds lookup, used by the elections feature to link a candidate
// card back to their /members/[bioguideId] page when they're an incumbent.

import LegislatorCrosswalk from "@/models/LegislatorCrosswalk";

export interface LegislatorRecord {
  id?: {
    bioguide?: string;
    thomas?: string;
    govtrack?: number;
    opensecrets?: string;
    icpsr?: number;
    fec?: string[];
    wikipedia?: string;
  };
}

export interface CrosswalkRow {
  bioguideId: string;
  fecIds: string[];
  opensecretsId?: string;
  govtrackId?: number;
  thomasId?: string;
  icpsrId?: number;
  wikipediaTitle?: string;
}

/**
 * Convert a single legislator record from the congress-legislators JSON feed
 * into a CrosswalkRow. Returns null when the record has no bioguide ID — every
 * usable row must have one because that's how Heard keys members.
 */
export function toCrosswalkRow(rec: LegislatorRecord): CrosswalkRow | null {
  const id = rec.id;
  if (!id || !id.bioguide) return null;

  return {
    bioguideId: id.bioguide,
    fecIds: Array.isArray(id.fec) ? id.fec.filter((f) => typeof f === "string") : [],
    opensecretsId: id.opensecrets,
    govtrackId: typeof id.govtrack === "number" ? id.govtrack : undefined,
    thomasId: id.thomas,
    icpsrId: typeof id.icpsr === "number" ? id.icpsr : undefined,
    wikipediaTitle: id.wikipedia,
  };
}

/**
 * Parse the full legislators-current.json (or historical) array into rows
 * keyed by bioguide. Records without a bioguide are dropped silently — these
 * exist in the historical file for very old members.
 */
export function parseLegislators(records: LegislatorRecord[]): CrosswalkRow[] {
  const rows: CrosswalkRow[] = [];
  for (const r of records) {
    const row = toCrosswalkRow(r);
    if (row) rows.push(row);
  }
  return rows;
}

export interface IncumbentLink {
  bioguideId: string;
}

/**
 * Returns the bioguideId of an incumbent with this FEC candidate ID, or null
 * if the FEC ID belongs to a challenger or non-sitting candidate.
 *
 * LegislatorCrosswalk.fecIds is an array because a legislator can have
 * multiple FEC IDs across cycles. Mongo's array-element match handles it.
 */
export async function findIncumbentByFecId(
  fecId: string
): Promise<IncumbentLink | null> {
  const doc = await LegislatorCrosswalk.findOne({ fecIds: fecId })
    .select("bioguideId")
    .lean();
  if (!doc) return null;
  return { bioguideId: doc.bioguideId };
}
