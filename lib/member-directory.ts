// lib/member-directory.ts
//
// The members page lists every current member of Congress from Congress.gov
// and layers Heard's community alignment scores on top. MemberScore can't be
// the list itself: a member only gets a row once their roll-call votes have
// been compared with community votes, and rows written that way carry scores
// but no name or seat.
import connectDB from "@/lib/db";
import { fetchCurrentMembers } from "@/lib/congress";
import MemberScore from "@/models/MemberScore";

export interface DirectoryMember {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district: number | null;
  chamber: string;
  imageUrl?: string;
  communityScore: number | null;
  matchingVotes: number;
  totalCompared: number;
}

/**
 * Every current member of Congress with their community alignment. If
 * Congress.gov is unavailable, falls back to the members MemberScore fully
 * describes (rows from scripts/seed-member-scores.ts).
 */
export async function getMemberDirectory(): Promise<DirectoryMember[]> {
  await connectDB();
  const [current, scores] = await Promise.all([
    fetchCurrentMembers().catch((e) => {
      console.error("Congress.gov member list unavailable:", e instanceof Error ? e.message : e);
      return [];
    }),
    MemberScore.find()
      .select("bioguideId name party state district chamber communityScore matchingVotes totalCompared")
      .lean(),
  ]);

  if (current.length > 0) {
    const scoreById = new Map(scores.map((s) => [s.bioguideId, s]));
    return current.map((m) => {
      const score = scoreById.get(m.id);
      return {
        bioguideId: m.id,
        name: m.name,
        party: m.party,
        state: m.state,
        district: m.district ?? null,
        chamber: m.chamber,
        imageUrl: m.imageUrl,
        communityScore: score?.communityScore ?? null,
        matchingVotes: score?.matchingVotes ?? 0,
        totalCompared: score?.totalCompared ?? 0,
      };
    });
  }

  return scores
    .filter((s) => s.name && s.state && s.chamber)
    .map((s) => ({
      bioguideId: s.bioguideId,
      name: s.name,
      party: s.party ?? "",
      state: s.state,
      district: s.district ?? null,
      chamber: s.chamber,
      communityScore: s.communityScore ?? null,
      matchingVotes: s.matchingVotes ?? 0,
      totalCompared: s.totalCompared ?? 0,
    }));
}
