import { createHash } from "node:crypto";
import type {
  BallotContest,
  BallotData,
  BallotElection,
  BallotElectionsResponse,
  BallotLookupResponse,
} from "@/lib/ballot-types";

type JsonObject = Record<string, unknown>;
const API_URL = "https://www.googleapis.com/civicinfo/v2/";
const UNAVAILABLE = "Ballot information is unavailable right now. This does not mean there are no contests on your ballot. Check your election office’s official sample ballot.";
const NOT_CONFIGURED = "Address lookup is not connected yet. Visit your election office for your official sample ballot.";

function object(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function string(value: unknown, maximum = 1000): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maximum)
    : undefined;
}

function officialText(value: unknown): string | undefined {
  // An excerpt must never be presented as the full wording or voting instructions.
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function identifier(value: unknown): string | undefined {
  const id = typeof value === "number" ? String(value) : string(value, 30);
  return id && /^\d{1,20}$/.test(id) ? id : undefined;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24);
}

function safeUrl(value: unknown): string | undefined {
  const raw = string(value, 2049);
  if (!raw || raw.length > 2048 || /[\u0000-\u0020\u007f]/.test(raw)) return undefined;
  try {
    const url = new URL(raw);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function positiveInteger(value: unknown): number | null {
  const number = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof number === "number" && Number.isSafeInteger(number) && number > 0
    ? number
    : null;
}

function inBallotOrder(values: unknown, field: string): JsonObject[] {
  const items = list(values).map(object);
  const placement = (value: unknown) => {
    const number = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
    return typeof number === "number" && Number.isSafeInteger(number) && number >= 0 ? number : null;
  };
  // Partial placement data cannot establish a full order. Preserve provider order.
  if (!items.every((item) => placement(item[field]) !== null)) return items;
  return items.sort((a, b) => placement(a[field])! - placement(b[field])!);
}

function election(value: unknown): BallotElection | null {
  const raw = object(value);
  const id = identifier(raw.id);
  const name = string(raw.name);
  const date = string(raw.electionDay, 100);
  if (!id || id === "2000" || !name || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) return null;
  return { id, name, date };
}

function upcomingElections(values: unknown, now: Date): BallotElection[] {
  // Keep election-day information available until the day has ended in every
  // inhabited US jurisdiction. UTC midnight is still voting time in US states.
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Pago_Pago", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const today = ["year", "month", "day"].map((part) => dateParts.find(({ type }) => type === part)!.value).join("-");
  const unique = new Map<string, BallotElection>();
  for (const value of list(values)) {
    const result = election(value);
    if (result && result.date >= today) unique.set(result.id, result);
  }
  return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function formatAddress(value: unknown): string {
  const address = object(value);
  return [address.line1, address.line2, address.line3, address.city, address.state, address.zip]
    .map((part) => string(part, 300)).filter(Boolean).join(", ");
}

function contestLevel(contest: JsonObject, isMeasure: boolean): BallotContest["level"] {
  if (isMeasure) return "Ballot questions";
  const levels = list(contest.level);
  const scope = string(object(contest.district).scope);
  if (levels.includes("country") || scope === "national" || scope === "congressional") return "Federal";
  if (levels.includes("administrativeArea1") || ["statewide", "stateUpper", "stateLower"].includes(scope ?? "")) return "State";
  if (levels.some((level) => ["regional", "administrativeArea2", "locality", "subLocality1", "subLocality2", "special"].includes(String(level))) ||
    ["countywide", "schoolBoard", "citywide", "cityWide", "township", "countyCouncil", "cityCouncil", "ward", "special"].includes(scope ?? "")) return "Local";
  return "Other";
}

function normalizeContest(raw: JsonObject): BallotContest {
  const kind = ["referendum", "ballot-measure"].includes(string(raw.type)?.toLowerCase() ?? "") || string(raw.referendumTitle) ? "measure" : "candidate";
  const title = officialText(raw.ballotTitle) ?? officialText(raw.office) ?? officialText(raw.referendumTitle) ?? "Contest details unavailable";
  const district = object(raw.district);
  const primaryParty = string(raw.primaryParty);
  const id = hash([
    title, string(district.name), string(district.scope), string(district.id), primaryParty, kind,
    list(raw.level).filter((level): level is string => typeof level === "string").sort(),
    string(raw.type)?.toLowerCase(), string(raw.special)?.toLowerCase() === "yes",
  ]);
  return {
    id,
    title,
    level: contestLevel(raw, kind === "measure"),
    kind,
    district: string(district.name),
    voteFor: positiveInteger(raw.numberVotingFor),
    primaryParty,
    ...(string(raw.special)?.toLowerCase() === "yes" ? { special: true } : {}),
    eligibility: officialText(raw.electorateSpecifications),
    candidates: inBallotOrder(raw.candidates, "orderOnBallot").flatMap((candidate) => {
      const name = string(candidate.name);
      if (!name) return [];
      const party = string(candidate.party);
      return [{ id: hash([id, name, party]), name, party, url: safeUrl(candidate.candidateUrl) }];
    }),
    ...(kind === "measure" ? {
      measure: {
        text: officialText(raw.referendumText),
        summary: officialText(raw.referendumBrief) ?? officialText(raw.referendumSubtitle),
        url: safeUrl(raw.referendumUrl),
        responses: list(raw.referendumBallotResponses).flatMap((response) => officialText(response) ? [officialText(response)!] : []),
        // Pro/con statements are advocacy, not explanations of what a Yes/No vote does.
      },
    } : {}),
    sources: list(raw.sources).flatMap((value) => {
      const source = object(value);
      const name = string(source.name);
      return name ? [{ name, official: source.official === true }] : [];
    }),
  };
}

function normalizeContests(values: unknown): BallotContest[] {
  const contests = inBallotOrder(values, "ballotPlacement").map(normalizeContest);
  const counts = new Map<string, number>();
  for (const contest of contests) counts.set(contest.id, (counts.get(contest.id) ?? 0) + 1);
  const occurrences = new Map<string, number>();
  return contests.map((contest) => {
    if (counts.get(contest.id) === 1) return contest;
    // Placement can change when the provider adds missing contests. For collisions,
    // identify differing content instead; never share notes between duplicate rows.
    const identity = hash([
      contest.id, contest.voteFor, contest.eligibility, contest.measure,
      contest.candidates.map(({ name, party }) => [name, party]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    ]);
    const occurrence = occurrences.get(identity) ?? 0;
    occurrences.set(identity, occurrence + 1);
    const id = hash([identity, occurrence]);
    return { ...contest, id, candidates: contest.candidates.map((candidate) => ({ ...candidate, id: hash([id, candidate.name, candidate.party]) })) };
  });
}

function officialLinks(states: unknown): BallotData["officialLinks"] {
  const links = new Map<string, { label: string; url: string }>();
  function visit(regionValue: unknown, depth: number) {
    if (depth > 5) return;
    const region = object(regionValue);
    const body = object(region.electionAdministrationBody);
    const name = string(body.name) ?? string(region.name) ?? "Election office";
    const fields = [
      ["ballotInfoUrl", "Official ballot information"],
      ["electionInfoUrl", "Election information"],
      ["electionRegistrationConfirmationUrl", "Check voter registration"],
      ["votingLocationFinderUrl", "Find voting locations"],
      ["absenteeVotingInfoUrl", "Mail voting information"],
    ];
    for (const [field, label] of fields) {
      const url = safeUrl(body[field]);
      if (url && !links.has(url)) links.set(url, { label: `${label} · ${name}`, url });
    }
    if (region.local_jurisdiction) visit(region.local_jurisdiction, depth + 1);
  }
  list(states).forEach((state) => visit(state, 0));
  return [...links.values()];
}

export function normalizeBallot(value: unknown, address: string, now = new Date()): BallotData | null {
  const raw = object(value);
  const selected = election(raw.election);
  if (!selected) return null;
  const normalizedAddress = formatAddress(raw.normalizedInput) || address;
  const input = object(raw.normalizedInput);
  const locations: BallotData["locations"] = [];
  const locationGroups: [string, BallotData["locations"][number]["kind"]][] = [
    ["pollingLocations", "Election day"], ["earlyVoteSites", "Early voting"], ["dropOffLocations", "Ballot drop-off"],
  ];
  for (const [field, kind] of locationGroups) {
    for (const item of list(raw[field])) {
      const location = object(item);
      const locationAddress = formatAddress(location.address);
      if (!locationAddress) continue;
      locations.push({
        kind,
        name: string(location.name) ?? string(object(location.address).locationName) ?? kind,
        address: locationAddress,
        hours: string(location.pollingHours, 4000),
        notes: string(location.notes, 4000),
      });
    }
  }
  return {
    id: hash([selected.id, normalizedAddress.toLowerCase().replace(/\s+/g, " ")]),
    election: selected,
    normalizedAddress,
    locationLabel: [string(input.city), string(input.state)].filter(Boolean).join(", ") || "Your voting address",
    contests: normalizeContests(raw.contests),
    coverage: "partial",
    checkedAt: now.toISOString(),
    officialLinks: officialLinks(raw.state),
    locations,
    mailOnly: raw.mailOnly === true,
  };
}

function apiKey(): string | undefined {
  return process.env.GOOGLE_CIVIC_API_KEY?.trim() || process.env.GOOGLE_KEY?.trim();
}

async function civicRequest(path: string, key: string, params: Record<string, string> = {}) {
  const url = new URL(path, API_URL);
  url.search = new URLSearchParams({ ...params, key }).toString();
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    headers: { Accept: "application/json" },
  });
  const data: unknown = await response.json();
  return { ok: response.ok, data };
}

export async function getBallotElections(now = new Date()): Promise<BallotElectionsResponse> {
  const key = apiKey();
  if (!key) return { status: "not_configured", elections: [], message: NOT_CONFIGURED };
  try {
    const result = await civicRequest("elections", key);
    if (!result.ok || !Array.isArray(object(result.data).elections)) return { status: "unavailable", elections: [], message: UNAVAILABLE };
    return { status: "ready", elections: upcomingElections(object(result.data).elections, now) };
  } catch {
    return { status: "unavailable", elections: [], message: UNAVAILABLE };
  }
}

export async function lookupBallot(address: string, electionId?: string, now = new Date()): Promise<BallotLookupResponse> {
  const key = apiKey();
  if (!key) return { status: "not_configured", message: NOT_CONFIGURED };
  try {
    const params: Record<string, string> = { address, officialOnly: "true" };
    if (electionId) params.electionId = electionId;
    const result = await civicRequest("voterinfo", key, params);
    const data = object(result.data);
    // Civic can return some election data alongside an unsuccessful address status.
    // Never present that data as matched to this voter, even when HTTP succeeds.
    if (!result.ok || ("status" in data && data.status !== "success")) {
      const reasons = [data.status, ...list(object(data.error).errors).map((value) => string(object(value).reason))];
      if (reasons.includes("multipleStreetSegmentsFound")) {
        return { status: "invalid_address", message: "We could not uniquely match that registered address. Include any apartment or unit, or contact your election office for confirmation." };
      }
      if (reasons.some((reason) => reason === "parseError" || reason === "addressUnparseable")) {
        return { status: "invalid_address", message: "We could not match that address. Enter your full registered street address, including city, state, and ZIP code." };
      }
      return { status: "unavailable", message: UNAVAILABLE };
    }
    const elections = upcomingElections([data.election, ...list(data.otherElections)], now);
    if (!electionId && list(data.otherElections).length > 0 && elections.length > 0) {
      return { status: "election_required", elections, message: "Choose the election you are preparing for. For a primary, select the ballot you are eligible to vote." };
    }
    const ballot = normalizeBallot(data, address, now);
    if (!ballot || !elections.some((item) => item.id === ballot.election.id) || (electionId && electionId !== ballot.election.id)) {
      return { status: "unavailable", message: UNAVAILABLE, elections };
    }
    return {
      status: "ready",
      ballot,
      ...(ballot.contests.length === 0 ? { message: "Contest information has not been provided for this address. This is not an empty ballot. Check your election office’s official sample ballot." } : {}),
    };
  } catch {
    return { status: "unavailable", message: UNAVAILABLE };
  }
}
