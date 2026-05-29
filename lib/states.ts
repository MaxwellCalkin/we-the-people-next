// lib/states.ts
//
// Static state metadata used by the elections feature (state picker, page
// titles). Includes the 50 states, DC, and the five federal territories that
// elect non-voting delegates — Heard already stores `state` codes for them on
// user records, so we render them in the picker for completeness.

export interface StateInfo {
  code: string;
  name: string;
  /** Number of House districts (or 0 for territories with only a delegate). */
  houseDistricts: number;
  isTerritory?: boolean;
}

// House district counts reflect the 119th Congress (2025–2027 apportionment).
// Territories elect non-voting delegates; we treat them as 0 voting districts.
export const STATES: StateInfo[] = [
  { code: "AL", name: "Alabama", houseDistricts: 7 },
  { code: "AK", name: "Alaska", houseDistricts: 1 },
  { code: "AZ", name: "Arizona", houseDistricts: 9 },
  { code: "AR", name: "Arkansas", houseDistricts: 4 },
  { code: "CA", name: "California", houseDistricts: 52 },
  { code: "CO", name: "Colorado", houseDistricts: 8 },
  { code: "CT", name: "Connecticut", houseDistricts: 5 },
  { code: "DE", name: "Delaware", houseDistricts: 1 },
  { code: "FL", name: "Florida", houseDistricts: 28 },
  { code: "GA", name: "Georgia", houseDistricts: 14 },
  { code: "HI", name: "Hawaii", houseDistricts: 2 },
  { code: "ID", name: "Idaho", houseDistricts: 2 },
  { code: "IL", name: "Illinois", houseDistricts: 17 },
  { code: "IN", name: "Indiana", houseDistricts: 9 },
  { code: "IA", name: "Iowa", houseDistricts: 4 },
  { code: "KS", name: "Kansas", houseDistricts: 4 },
  { code: "KY", name: "Kentucky", houseDistricts: 6 },
  { code: "LA", name: "Louisiana", houseDistricts: 6 },
  { code: "ME", name: "Maine", houseDistricts: 2 },
  { code: "MD", name: "Maryland", houseDistricts: 8 },
  { code: "MA", name: "Massachusetts", houseDistricts: 9 },
  { code: "MI", name: "Michigan", houseDistricts: 13 },
  { code: "MN", name: "Minnesota", houseDistricts: 8 },
  { code: "MS", name: "Mississippi", houseDistricts: 4 },
  { code: "MO", name: "Missouri", houseDistricts: 8 },
  { code: "MT", name: "Montana", houseDistricts: 2 },
  { code: "NE", name: "Nebraska", houseDistricts: 3 },
  { code: "NV", name: "Nevada", houseDistricts: 4 },
  { code: "NH", name: "New Hampshire", houseDistricts: 2 },
  { code: "NJ", name: "New Jersey", houseDistricts: 12 },
  { code: "NM", name: "New Mexico", houseDistricts: 3 },
  { code: "NY", name: "New York", houseDistricts: 26 },
  { code: "NC", name: "North Carolina", houseDistricts: 14 },
  { code: "ND", name: "North Dakota", houseDistricts: 1 },
  { code: "OH", name: "Ohio", houseDistricts: 15 },
  { code: "OK", name: "Oklahoma", houseDistricts: 5 },
  { code: "OR", name: "Oregon", houseDistricts: 6 },
  { code: "PA", name: "Pennsylvania", houseDistricts: 17 },
  { code: "RI", name: "Rhode Island", houseDistricts: 2 },
  { code: "SC", name: "South Carolina", houseDistricts: 7 },
  { code: "SD", name: "South Dakota", houseDistricts: 1 },
  { code: "TN", name: "Tennessee", houseDistricts: 9 },
  { code: "TX", name: "Texas", houseDistricts: 38 },
  { code: "UT", name: "Utah", houseDistricts: 4 },
  { code: "VT", name: "Vermont", houseDistricts: 1 },
  { code: "VA", name: "Virginia", houseDistricts: 11 },
  { code: "WA", name: "Washington", houseDistricts: 10 },
  { code: "WV", name: "West Virginia", houseDistricts: 2 },
  { code: "WI", name: "Wisconsin", houseDistricts: 8 },
  { code: "WY", name: "Wyoming", houseDistricts: 1 },
  { code: "DC", name: "District of Columbia", houseDistricts: 0, isTerritory: true },
  { code: "AS", name: "American Samoa", houseDistricts: 0, isTerritory: true },
  { code: "GU", name: "Guam", houseDistricts: 0, isTerritory: true },
  { code: "MP", name: "Northern Mariana Islands", houseDistricts: 0, isTerritory: true },
  { code: "PR", name: "Puerto Rico", houseDistricts: 0, isTerritory: true },
  { code: "VI", name: "U.S. Virgin Islands", houseDistricts: 0, isTerritory: true },
];

export function getStateInfo(code: string): StateInfo | null {
  return STATES.find((s) => s.code === code.toUpperCase()) ?? null;
}

const NAME_BY_CODE = new Map(STATES.map((s) => [s.code, s.name]));

export function stateName(code: string): string {
  return NAME_BY_CODE.get(code.toUpperCase()) ?? code;
}

export function isValidStateCode(code: string): boolean {
  return NAME_BY_CODE.has(code.toUpperCase());
}
