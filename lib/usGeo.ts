// lib/usGeo.ts — pure US geography helpers (state abbr <-> FIPS, district keys).
// The single source of truth for district-key construction used by both
// lib/proposals.ts (tally buckets) and components/features/UpvoteHeatMap.tsx.

const ABBR_TO_FIPS: Record<string, string> = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09", DE: "10", DC: "11",
  FL: "12", GA: "13", HI: "15", ID: "16", IL: "17", IN: "18", IA: "19", KS: "20", KY: "21",
  LA: "22", ME: "23", MD: "24", MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30",
  NE: "31", NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38", OH: "39",
  OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46", TN: "47", TX: "48", UT: "49",
  VT: "50", VA: "51", WA: "53", WV: "54", WI: "55", WY: "56",
};

const FIPS_TO_ABBR: Record<string, string> = Object.fromEntries(
  Object.entries(ABBR_TO_FIPS).map(([a, f]) => [f, a])
);

export function stateToFips(abbr: string): string | undefined {
  return ABBR_TO_FIPS[abbr?.toUpperCase()];
}

export function fipsToState(fips: string): string | undefined {
  return FIPS_TO_ABBR[fips];
}

export function districtKey(state: string, cd: string): string {
  const s = (state || "").toUpperCase();
  const n = parseInt(cd, 10);
  const num = Number.isFinite(n) ? String(n).padStart(2, "0") : "00";
  return `${s}-${num}`;
}
