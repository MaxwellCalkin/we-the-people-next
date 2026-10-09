// lib/format.ts — display formatting shared across pages. Pure functions only.
import { STATES } from "@/lib/states";

const BILL_TYPE_LABELS: Record<string, string> = {
  hr: "H.R.",
  s: "S.",
  hjres: "H.J.Res.",
  sjres: "S.J.Res.",
  hconres: "H.Con.Res.",
  sconres: "S.Con.Res.",
  hres: "H.Res.",
  sres: "S.Res.",
};

/** "hr725" → "H.R. 725", "sjres12" → "S.J.Res. 12". Unknown shapes are upper-cased. */
export function formatBillNumber(slug: string): string {
  const match = slug.trim().match(/^([a-z]+)(\d+)$/i);
  if (!match) return slug.toUpperCase();
  const type = match[1].toLowerCase();
  const label = BILL_TYPE_LABELS[type] ?? type.toUpperCase();
  return `${label} ${match[2]}`;
}

/** Originating chamber for a bill slug or type ("hr…" → House, "s…" → Senate). */
export function billChamber(slugOrType: string): "House" | "Senate" | null {
  const t = slugOrType.trim().toLowerCase();
  if (t.startsWith("h")) return "House";
  if (t.startsWith("s")) return "Senate";
  return null;
}

/**
 * Congress.gov returns member names as "Last, First M." — show them the way
 * people say them. Suffixes after a second comma are kept: "Smith, John, Jr."
 * → "John Smith, Jr.". Names without a comma are returned unchanged.
 */
export function displayName(name: string): string {
  const parts = name
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return name.trim();
  const [last, first, ...rest] = parts;
  const suffix = rest.join(", ");
  return `${first} ${last}${suffix ? `, ${suffix}` : ""}`;
}

const ROMAN = /^(II|III|IV|VI{0,3})$/;

function titleCaseWord(word: string): string {
  const bare = word.replace(/\.$/, "");
  if (ROMAN.test(bare)) return bare;
  if (bare === "JR" || bare === "SR") return `${bare[0]}${bare[1].toLowerCase()}.`;
  const lower = word.toLowerCase();
  let out = lower.replace(/(^|[-'’])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
  if (/^mc[a-z]/.test(lower)) out = `Mc${lower.charAt(2).toUpperCase()}${out.slice(3)}`;
  return out;
}

/**
 * Person names for display. Swaps "Last, First" and, for ALL-CAPS records like
 * the FEC's ("FETTERMAN, JOHN K"), converts to title case ("John K Fetterman").
 */
export function formatPersonName(name: string): string {
  const natural = displayName(name);
  if (/[a-z]/.test(natural)) return natural;
  // FEC records tack honorifics onto the first name ("HAYES, JAMES DR.").
  let doctor = false;
  const words = natural
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => {
      const bare = word.replace(/\.$/, "");
      if (bare === "DR") {
        doctor = true;
        return false;
      }
      return !["MR", "MRS", "MS", "MISS"].includes(bare);
    })
    .map(titleCaseWord);
  return `${doctor ? "Dr. " : ""}${words.join(" ")}`;
}

export interface PartyInfo {
  /** One-letter code, or "" when unknown. */
  code: string;
  label: string;
}

export function partyInfo(party: string | null | undefined): PartyInfo {
  const raw = (party ?? "").trim();
  const p = raw.toLowerCase();
  if (!p) return { code: "", label: "Party not listed" };
  if (p === "d" || p.startsWith("democrat")) return { code: "D", label: "Democrat" };
  if (p === "r" || p.startsWith("republican")) return { code: "R", label: "Republican" };
  if (p === "i" || p === "id" || p.startsWith("independent")) return { code: "I", label: "Independent" };
  return { code: raw.charAt(0).toUpperCase(), label: raw };
}

const CODE_BY_NAME = new Map(STATES.map((s) => [s.name.toLowerCase(), s.code]));
const NAME_BY_CODE = new Map(STATES.map((s) => [s.code, s.name]));

/** Accepts "Pennsylvania", "pennsylvania", "PA" or "pa" and returns "PA". Unknown input is returned trimmed. */
export function stateCode(nameOrCode: string): string {
  const value = nameOrCode.trim();
  const upper = value.toUpperCase();
  if (NAME_BY_CODE.has(upper)) return upper;
  return CODE_BY_NAME.get(value.toLowerCase()) ?? value;
}

/**
 * Short seat label: senators get their state's name, House members get
 * "PA-12". At-large seats (district 0 or missing) read "VT at-large".
 */
export function seatLabel(chamber: string, state: string, district?: number | string | null): string {
  const code = stateCode(state);
  if (chamber === "Senate") return NAME_BY_CODE.get(code) ?? state;
  const n = typeof district === "string" ? parseInt(district, 10) : district;
  if (!n) return `${code} at-large`;
  return `${code}-${String(n).padStart(2, "0")}`;
}

export function memberTitle(chamber: string): "Sen." | "Rep." {
  return chamber === "Senate" ? "Sen." : "Rep.";
}

/** Calendar dates ("2026-10-05") are formatted without timezone drift. */
export function formatDate(value: string | Date | undefined | null, style: "short" | "long" = "short"): string {
  if (!value) return "";
  const date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: style === "long" ? "long" : "short",
    day: "numeric",
    year: "numeric",
  });
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 days ago" / "just now". `now` is injectable for tests. */
export function timeAgo(value: string | Date, now: Date = new Date()): string {
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return "";
  const seconds = Math.round((then.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (abs >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

/** Whole-number percentage shares that always sum to 100 (or 0/0 when there are no votes). */
export function voteShares(yeas: number, nays: number): { yea: number; nay: number; total: number } {
  const total = Math.max(0, yeas) + Math.max(0, nays);
  if (total === 0) return { yea: 0, nay: 0, total: 0 };
  const yea = Math.round((Math.max(0, yeas) / total) * 100);
  return { yea, nay: 100 - yea, total };
}

const CONGRESS_GOV_TYPES: Record<string, string> = {
  hr: "house-bill",
  s: "senate-bill",
  hres: "house-resolution",
  sres: "senate-resolution",
  hjres: "house-joint-resolution",
  sjres: "senate-joint-resolution",
  hconres: "house-concurrent-resolution",
  sconres: "senate-concurrent-resolution",
};

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/** Official Congress.gov page for a bill, e.g. …/bill/119th-congress/house-bill/725. */
export function congressGovUrl(congress: string | number, slug: string): string | null {
  const match = slug.trim().match(/^([a-z]+)(\d+)$/i);
  const n = typeof congress === "number" ? congress : parseInt(congress, 10);
  if (!match || !Number.isFinite(n)) return null;
  const type = CONGRESS_GOV_TYPES[match[1].toLowerCase()];
  if (!type) return null;
  return `https://www.congress.gov/bill/${ordinal(n)}-congress/${type}/${match[2]}`;
}

export interface MemberVoteInfo {
  /** Yea/Nay when the member cast a recorded vote, otherwise null. */
  position: "Yea" | "Nay" | null;
  /** Human-readable status for display. */
  label: string;
}

/** Normalize roll-call outcomes ("Aye", "Not Voting", "Passed by Voice Vote", …). */
export function memberVoteInfo(vote: string | null | undefined): MemberVoteInfo {
  const v = (vote ?? "").trim();
  if (v === "Yea" || v === "Aye") return { position: "Yea", label: "Yea" };
  if (v === "Nay" || v === "No") return { position: "Nay", label: "Nay" };
  if (v === "Not Voting") return { position: null, label: "Didn't vote" };
  if (v === "Present") return { position: null, label: "Voted present" };
  if (v === "Passed by Voice Vote") return { position: null, label: "Passed by voice vote" };
  if (v === "Passed by Unanimous Consent") return { position: null, label: "Passed by unanimous consent" };
  return { position: null, label: "No recorded vote yet" };
}

export type Agreement = "agree" | "disagree" | "none";

export function agreement(userVote: "Yea" | "Nay" | null | undefined, memberVote: string | null | undefined): Agreement {
  const { position } = memberVoteInfo(memberVote);
  if (!userVote || !position) return "none";
  return userVote === position ? "agree" : "disagree";
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;
}
