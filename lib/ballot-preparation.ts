import type { BallotContest } from "./ballot-types";

export interface BallotPreparation {
  choices: Record<string, string[]>;
  notes: Record<string, string>;
  reviewed: string[];
}

export function emptyPreparation(): BallotPreparation {
  return { choices: {}, notes: {}, reviewed: [] };
}

export function contestOptions(
  contest: BallotContest,
): Array<{ id: string; label: string; party?: string; url?: string }> {
  const options = contest.kind === "measure"
    ? (contest.measure?.responses ?? []).map((response) => ({ id: response, label: response }))
    : contest.candidates.map((candidate) => ({
        id: candidate.id,
        label: candidate.name,
        party: candidate.party,
        url: candidate.url,
      }));
  const seen = new Set<string>();
  return options.filter(({ id }) => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function selectionLimit(contest: BallotContest): number {
  if (contest.voteFor === null) return contest.kind === "measure" ? 1 : 0;
  return Number.isSafeInteger(contest.voteFor) && contest.voteFor > 0 ? contest.voteFor : 0;
}

function validChoices(contest: BallotContest, value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(contestOptions(contest).map(({ id }) => id));
  return [...new Set(value.filter((id): id is string => typeof id === "string" && allowed.has(id)))]
    .slice(0, selectionLimit(contest));
}

// Stored preparation is untrusted. Ignore inherited properties, getters, and non-record objects.
function ownValue(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

export function sanitizePreparation(value: unknown, contests: BallotContest[]): BallotPreparation {
  const choices = ownValue(value, "choices");
  const notes = ownValue(value, "notes");
  const reviewed = ownValue(value, "reviewed");
  const validContestIds = new Set(contests.map(({ id }) => id));

  return {
    choices: Object.fromEntries(contests.flatMap((contest) => {
      const selected = validChoices(contest, ownValue(choices, contest.id));
      return selected.length ? [[contest.id, selected]] : [];
    })),
    notes: Object.fromEntries(contests.flatMap(({ id }) => {
      const note = ownValue(notes, id);
      if (typeof note !== "string") return [];
      const trimmed = note.trim().slice(0, 2000);
      return trimmed ? [[id, trimmed]] : [];
    })),
    reviewed: Array.isArray(reviewed)
      ? [...new Set(reviewed.filter((id): id is string => typeof id === "string" && validContestIds.has(id)))]
      : [],
  };
}

export function toggleChoice(contest: BallotContest, current: string[], optionId: string): string[] {
  const selected = validChoices(contest, current);
  const limit = selectionLimit(contest);
  if (!limit || !contestOptions(contest).some(({ id }) => id === optionId)) return selected;
  if (selected.includes(optionId)) return selected.filter((id) => id !== optionId);
  if (limit === 1) return [optionId];
  return selected.length < limit ? [...selected, optionId] : selected;
}

export function preparationStorageKey(ballotId: string, primaryParty?: string): string {
  return `heard:ballot-preparation:v1:${JSON.stringify([ballotId, primaryParty ?? ""])}`;
}
