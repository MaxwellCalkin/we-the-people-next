# Profile Enhancement, Member Directory & Bills Revamp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the profile page with avatars and alignment scores, add a congressional member directory with community alignment leaderboard, create individual member profile pages, and revamp the bills page with trending/top/new views.

**Architecture:** Three new Mongoose models (MemberVote, MemberScore, BillVoteEvent) support cached vote data and precomputed scores. The vote API route is extended to create BillVoteEvents and trigger async member vote caching + score recomputation. New pages are server components that query MongoDB directly. The bills page gets a client-side toggle between trending/top/new views.

**Tech Stack:** Next.js 16, React 19, TypeScript, Mongoose 9, MongoDB, NextAuth 5, Cloudinary, Tailwind CSS 4, Congress.gov API v3

**Spec:** `docs/superpowers/specs/2026-04-01-profile-directory-trending-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|----------------|
| `models/MemberVote.ts` | Cached individual member votes on bills |
| `models/MemberScore.ts` | Precomputed community alignment scores per member |
| `models/BillVoteEvent.ts` | Timestamped vote events for trending/top calculations |
| `lib/member-votes.ts` | Async logic: fetch roll call XML, parse, bulk upsert MemberVotes, recompute MemberScores |
| `lib/trending.ts` | Trending score calculation + top bills aggregation |
| `app/api/user/avatar/route.ts` | Avatar upload endpoint |
| `app/(dashboard)/members/page.tsx` | Member directory (leaderboard) page |
| `app/(dashboard)/members/[bioguideId]/page.tsx` | Individual member profile page |
| `app/(dashboard)/members/[bioguideId]/votes/page.tsx` | Full voting record page |
| `components/features/MemberCard.tsx` | Single member row in the directory leaderboard |
| `components/features/MemberDirectory.tsx` | Client component: filters, search, sort, renders member list |
| `components/features/MemberProfileHeader.tsx` | Member profile hero section |
| `components/features/MemberStats.tsx` | 3 stat cards (community alignment, personal alignment, tenure) |
| `components/features/MemberVoteList.tsx` | Vote list with community match indicators |
| `components/features/BillsPageTabs.tsx` | Client component: Trending/Top/New toggle |
| `components/features/TrendingBillsList.tsx` | Client component: renders trending bills |
| `components/features/TopBillsList.tsx` | Client component: renders top bills with period filter |
| `components/features/AvatarUpload.tsx` | Client component: avatar upload modal |
| `components/ui/Avatar.tsx` | Reusable avatar component (image / initials fallback) |
| `components/ui/AlignmentBadge.tsx` | Reusable score display with color coding |

### Modified Files
| File | Change |
|------|--------|
| `models/User.ts` | Add `avatar: String` field |
| `types/index.ts` | Add MemberScore, MemberVote, BillVoteEvent interfaces |
| `app/api/vote/route.ts` | Add BillVoteEvent creation + trigger async member vote caching |
| `app/(dashboard)/profile/page.tsx` | Pass avatar + alignment data to enhanced ProfileHeader |
| `components/features/ProfileHeader.tsx` | Redesign with avatar, rep cards with photos + alignment |
| `components/layout/Navbar.tsx` | Add "Members" link, rename "New Bills" to "Bills" |
| `app/(dashboard)/bills/page.tsx` | Revamp with Trending/Top/New tabs |
| `next.config.ts` | Add congress.gov to image remotePatterns |
| `lib/auth.ts` | Persist Google avatar on OAuth login |
| `lib/congress.ts` | Add `fetchMemberDetail()` for full member data (committees, terms, sponsored bills) |

---

## Task 1: Add congress.gov to Next.js Image Config

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Update next.config.ts to allow Congress.gov images**

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "www.congress.gov",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 2: Commit**

```bash
git add next.config.ts
git commit -m "config: add congress.gov to Next.js image remote patterns"
```

---

## Task 2: Add Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add new interfaces to types/index.ts**

Append after the existing `VotePosition` type:

```typescript
export interface IMemberVote {
  bioguideId: string;
  billSlug: string;
  congress: string;
  vote: string;
  chamber: string;
  fetchedAt: Date;
}

export interface IMemberScore {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district: number | null;
  chamber: string;
  communityScore: number | null;
  matchingVotes: number;
  totalCompared: number;
  updatedAt: Date;
}

export interface IBillVoteEvent {
  billSlug: string;
  congress: string;
  votedAt: Date;
}

export interface MemberDetail {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: number;
  chamber: string;
  imageUrl: string;
  website?: string;
  phone?: string;
  leadership?: string;
  terms: { congress: number; chamber: string; startYear: number; endYear?: number }[];
  committees: { name: string }[];
  sponsoredBills: { billSlug: string; congress: string; title: string; introducedDate: string; latestAction: string }[];
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add types for MemberVote, MemberScore, BillVoteEvent, MemberDetail"
```

---

## Task 3: Create Mongoose Models

**Files:**
- Create: `models/MemberVote.ts`
- Create: `models/MemberScore.ts`
- Create: `models/BillVoteEvent.ts`
- Modify: `models/User.ts`

- [ ] **Step 1: Create MemberVote model**

```typescript
// models/MemberVote.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMemberVoteDoc extends Document {
  bioguideId: string;
  billSlug: string;
  congress: string;
  vote: string;
  chamber: string;
  fetchedAt: Date;
}

const MemberVoteSchema = new Schema<IMemberVoteDoc>({
  bioguideId: { type: String, required: true },
  billSlug: { type: String, required: true },
  congress: { type: String, required: true },
  vote: { type: String, required: true },
  chamber: { type: String, required: true },
  fetchedAt: { type: Date, default: Date.now },
});

MemberVoteSchema.index(
  { bioguideId: 1, billSlug: 1, congress: 1 },
  { unique: true }
);

const MemberVote: Model<IMemberVoteDoc> =
  mongoose.models.MemberVote ||
  mongoose.model<IMemberVoteDoc>("MemberVote", MemberVoteSchema);

export default MemberVote;
```

- [ ] **Step 2: Create MemberScore model**

```typescript
// models/MemberScore.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMemberScoreDoc extends Document {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district: number | null;
  chamber: string;
  communityScore: number | null;
  matchingVotes: number;
  totalCompared: number;
  updatedAt: Date;
}

const MemberScoreSchema = new Schema<IMemberScoreDoc>({
  bioguideId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  party: { type: String, required: true },
  state: { type: String, required: true },
  district: { type: Number, default: null },
  chamber: { type: String, required: true },
  communityScore: { type: Number, default: null },
  matchingVotes: { type: Number, default: 0 },
  totalCompared: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

MemberScoreSchema.index({ communityScore: -1 });

const MemberScore: Model<IMemberScoreDoc> =
  mongoose.models.MemberScore ||
  mongoose.model<IMemberScoreDoc>("MemberScore", MemberScoreSchema);

export default MemberScore;
```

- [ ] **Step 3: Create BillVoteEvent model**

```typescript
// models/BillVoteEvent.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBillVoteEventDoc extends Document {
  billSlug: string;
  congress: string;
  votedAt: Date;
}

const BillVoteEventSchema = new Schema<IBillVoteEventDoc>({
  billSlug: { type: String, required: true },
  congress: { type: String, required: true },
  votedAt: { type: Date, default: Date.now },
});

BillVoteEventSchema.index({ billSlug: 1, votedAt: -1 });
BillVoteEventSchema.index({ votedAt: -1 });

const BillVoteEvent: Model<IBillVoteEventDoc> =
  mongoose.models.BillVoteEvent ||
  mongoose.model<IBillVoteEventDoc>("BillVoteEvent", BillVoteEventSchema);

export default BillVoteEvent;
```

- [ ] **Step 4: Add avatar field to User model**

In `models/User.ts`, add `avatar` to the interface and schema:

In the `IUser` interface, add after `cd: string;`:
```typescript
  avatar?: string;
```

In the `UserSchema`, add after `cd: { type: String },`:
```typescript
  avatar: { type: String, default: null },
```

- [ ] **Step 5: Commit**

```bash
git add models/MemberVote.ts models/MemberScore.ts models/BillVoteEvent.ts models/User.ts
git commit -m "feat: add MemberVote, MemberScore, BillVoteEvent models and User.avatar field"
```

---

## Task 4: Add fetchMemberDetail to Congress API Library

**Files:**
- Modify: `lib/congress.ts`

This function fetches full member data from Congress.gov: bio, committees, sponsored bills, terms, leadership.

- [ ] **Step 1: Add fetchMemberDetail function**

Append to the end of `lib/congress.ts`:

```typescript
/**
 * Fetch full member detail from Congress.gov by bioguide ID.
 * Includes terms, committees, sponsored legislation, and contact info.
 */
export async function fetchMemberDetail(
  bioguideId: string
): Promise<import("@/types").MemberDetail | null> {
  const url = `${CONGRESS_API}/member/${bioguideId}?api_key=${process.env.CONGRESS_KEY}&format=json`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  const m = data.member;
  if (!m) return null;

  // Determine current term for chamber/state/district
  const terms: { congress: number; chamber: string; startYear: number; endYear?: number }[] = [];
  let chamber = "";
  let state = "";
  let district: number | undefined;
  let leadership: string | undefined;

  if (m.terms) {
    for (const t of m.terms) {
      terms.push({
        congress: t.congress || 0,
        chamber: t.chamber === "Senate" ? "Senate" : "House",
        startYear: t.startYear || 0,
        endYear: t.endYear,
      });
    }
    // Most recent term is the current one
    const current = terms[terms.length - 1];
    if (current) {
      chamber = current.chamber;
    }
  }

  state = m.state || "";
  district = m.district;

  if (m.leadership && m.leadership.length > 0) {
    const current = m.leadership.find((l: { current?: boolean }) => l.current);
    if (current) {
      leadership = current.type;
    }
  }

  // Fetch committees
  const committees: { name: string }[] = [];
  try {
    const comUrl = `${CONGRESS_API}/member/${bioguideId}/committees?api_key=${process.env.CONGRESS_KEY}&format=json`;
    const comResp = await fetch(comUrl);
    if (comResp.ok) {
      const comData = await comResp.json();
      for (const c of comData.committees || []) {
        committees.push({ name: c.name || c.committeeName || "" });
      }
    }
  } catch (e) {
    console.log("Error fetching committees:", e instanceof Error ? e.message : e);
  }

  // Fetch sponsored legislation (latest 5)
  const sponsoredBills: { billSlug: string; congress: string; title: string; introducedDate: string; latestAction: string }[] = [];
  try {
    const spUrl = `${CONGRESS_API}/member/${bioguideId}/sponsored-legislation?limit=5&sort=updateDate+desc&api_key=${process.env.CONGRESS_KEY}&format=json`;
    const spResp = await fetch(spUrl);
    if (spResp.ok) {
      const spData = await spResp.json();
      for (const b of spData.sponsoredLegislation || []) {
        const bType = (b.type || "hr").toLowerCase();
        const bNumber = String(b.number || "");
        sponsoredBills.push({
          billSlug: `${bType}${bNumber}`,
          congress: String(b.congress || ""),
          title: b.title || "",
          introducedDate: b.introducedDate || "",
          latestAction: b.latestAction?.text || "",
        });
      }
    }
  } catch (e) {
    console.log("Error fetching sponsored legislation:", e instanceof Error ? e.message : e);
  }

  return {
    bioguideId: m.bioguideId || bioguideId,
    name: m.directOrderName || m.invertedOrderName || `${m.firstName || ""} ${m.lastName || ""}`.trim(),
    party: m.partyName || "",
    state,
    district,
    chamber,
    imageUrl: `https://www.congress.gov/img/member/${bioguideId.toLowerCase()}_200.jpg`,
    website: m.officialWebsiteUrl || m.url,
    phone: m.addressInformation?.officePhone,
    leadership,
    terms,
    committees,
    sponsoredBills,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/congress.ts
git commit -m "feat: add fetchMemberDetail for full member profile data from Congress.gov"
```

---

## Task 5: Create Member Vote Caching and Score Computation Library

**Files:**
- Create: `lib/member-votes.ts`

This is the core async logic that fetches roll call votes from XML, caches them, and recomputes scores.

- [ ] **Step 1: Create lib/member-votes.ts**

```typescript
// lib/member-votes.ts
import connectDB from "@/lib/db";
import MemberVote from "@/models/MemberVote";
import MemberScore from "@/models/MemberScore";
import Bill from "@/models/Bill";
import { parseBillSlug } from "@/lib/congress";

const CONGRESS_API = "https://api.congress.gov/v3";

/**
 * Fetch roll call votes for a bill and cache all member votes.
 * Parses Senate XML from senate.gov and House XML from clerk.house.gov.
 * Then recomputes community alignment scores for affected members.
 *
 * This should be called fire-and-forget (non-blocking) after a user votes.
 */
export async function cacheVotesAndRecomputeScores(
  billSlug: string,
  congress: string
): Promise<void> {
  try {
    await connectDB();

    const parsed = parseBillSlug(billSlug);
    if (!parsed) return;

    // Fetch bill actions to find roll call vote URLs
    const actionsUrl = `${CONGRESS_API}/bill/${congress}/${parsed.type}/${parsed.number}/actions?api_key=${process.env.CONGRESS_KEY}&format=json&limit=50`;
    const actionsResp = await fetch(actionsUrl);
    if (!actionsResp.ok) return;
    const actionsData = await actionsResp.json();
    const actions = actionsData.actions || [];

    const rollCallVotes: { url: string; chamber: string }[] = [];

    for (const action of actions) {
      if (action.recordedVotes && action.recordedVotes.length > 0) {
        for (const rv of action.recordedVotes) {
          if (!rv.url) continue;
          const chamber = rv.url.includes("senate.gov") ? "Senate" : "House";
          rollCallVotes.push({ url: rv.url, chamber });
        }
      }
    }

    if (rollCallVotes.length === 0) return;

    // Parse each roll call XML and extract all member votes
    const bulkOps: {
      updateOne: {
        filter: { bioguideId: string; billSlug: string; congress: string };
        update: { $set: { vote: string; chamber: string; fetchedAt: Date } };
        upsert: boolean;
      };
    }[] = [];

    for (const rv of rollCallVotes) {
      try {
        const xmlResp = await fetch(rv.url);
        if (!xmlResp.ok) continue;
        const xmlText = await xmlResp.text();

        if (rv.chamber === "Senate") {
          // Parse Senate XML: <member>...<bioguide_id>X</bioguide_id>...<vote_cast>Y</vote_cast>...</member>
          const memberRegex = /<member>[\s\S]*?<bioguide_id>([^<]+)<\/bioguide_id>[\s\S]*?<vote_cast>([^<]+)<\/vote_cast>[\s\S]*?<\/member>/gi;
          let match;
          while ((match = memberRegex.exec(xmlText)) !== null) {
            const bioguideId = match[1].trim();
            const vote = normalizeVote(match[2].trim());
            bulkOps.push({
              updateOne: {
                filter: { bioguideId, billSlug, congress },
                update: { $set: { vote, chamber: "Senate", fetchedAt: new Date() } },
                upsert: true,
              },
            });
          }
        } else {
          // Parse House XML: <recorded-vote> ... name-id="X" ... <vote>Y</vote>
          const memberRegex = /name-id="([^"]+)"[^>]*>[\s\S]*?<vote>([^<]+)<\/vote>/gi;
          let match;
          while ((match = memberRegex.exec(xmlText)) !== null) {
            const bioguideId = match[1].trim();
            const vote = normalizeVote(match[2].trim());
            bulkOps.push({
              updateOne: {
                filter: { bioguideId, billSlug, congress },
                update: { $set: { vote, chamber: "House", fetchedAt: new Date() } },
                upsert: true,
              },
            });
          }
        }
      } catch (e) {
        console.log("Error parsing roll call XML:", e instanceof Error ? e.message : e);
      }
    }

    if (bulkOps.length > 0) {
      await MemberVote.bulkWrite(bulkOps);
    }

    // Recompute community alignment scores for all members who voted on this bill
    await recomputeScoresForBill(billSlug, congress);
  } catch (e) {
    console.log("Error in cacheVotesAndRecomputeScores:", e instanceof Error ? e.message : e);
  }
}

/** Normalize vote strings: Aye->Yea, No->Nay */
function normalizeVote(vote: string): string {
  if (vote === "Aye") return "Yea";
  if (vote === "No") return "Nay";
  return vote;
}

/**
 * Recompute community alignment scores for all members who have a MemberVote
 * on the given bill. Compares each member's votes against community majority
 * across all bills.
 */
async function recomputeScoresForBill(
  billSlug: string,
  congress: string
): Promise<void> {
  // Get all members who voted on this specific bill
  const memberVotesOnBill = await MemberVote.find({ billSlug, congress })
    .select("bioguideId")
    .lean();

  const bioguideIds = [...new Set(memberVotesOnBill.map((mv) => mv.bioguideId))];
  if (bioguideIds.length === 0) return;

  // Get all community-voted bills and their majority positions
  const communityBills = await Bill.find({
    $or: [{ yeas: { $gt: 0 } }, { nays: { $gt: 0 } }],
  })
    .select("billSlug yeas nays")
    .lean();

  const communityMajority = new Map<string, string>();
  for (const bill of communityBills) {
    communityMajority.set(bill.billSlug, bill.yeas >= bill.nays ? "Yea" : "Nay");
  }

  const communityBillSlugs = [...communityMajority.keys()];

  // For each affected member, compute their score across ALL community bills
  const scoreBulkOps: {
    updateOne: {
      filter: { bioguideId: string };
      update: { $set: Record<string, unknown> };
      upsert: boolean;
    };
  }[] = [];

  // Batch: get all MemberVotes for these members on community bills
  const allMemberVotes = await MemberVote.find({
    bioguideId: { $in: bioguideIds },
    billSlug: { $in: communityBillSlugs },
  }).lean();

  // Group by member
  const votesByMember = new Map<string, { billSlug: string; vote: string; chamber: string }[]>();
  for (const mv of allMemberVotes) {
    const list = votesByMember.get(mv.bioguideId) || [];
    list.push({ billSlug: mv.billSlug, vote: mv.vote, chamber: mv.chamber });
    votesByMember.set(mv.bioguideId, list);
  }

  for (const bioguideId of bioguideIds) {
    const votes = votesByMember.get(bioguideId) || [];
    let matching = 0;
    let total = 0;

    for (const v of votes) {
      const majority = communityMajority.get(v.billSlug);
      if (!majority) continue;
      // Only count Yea/Nay votes (skip "Not Voting", "Present", etc.)
      if (v.vote !== "Yea" && v.vote !== "Nay") continue;
      total++;
      if (v.vote === majority) matching++;
    }

    const communityScore = total > 0 ? Math.round((matching / total) * 100) : null;
    const chamber = votes[0]?.chamber || "House";

    scoreBulkOps.push({
      updateOne: {
        filter: { bioguideId },
        update: {
          $set: {
            communityScore,
            matchingVotes: matching,
            totalCompared: total,
            chamber,
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    });
  }

  if (scoreBulkOps.length > 0) {
    await MemberScore.bulkWrite(scoreBulkOps);
  }
}

/**
 * Compute personal alignment score for a specific user against a specific member.
 * Returns { score: number | null, matching: number, total: number }.
 */
export async function computePersonalAlignment(
  bioguideId: string,
  yeaBillSlugs: string[],
  nayBillSlugs: string[]
): Promise<{ score: number | null; matching: number; total: number }> {
  const allUserSlugs = [...yeaBillSlugs, ...nayBillSlugs];
  if (allUserSlugs.length === 0) return { score: null, matching: 0, total: 0 };

  const memberVotes = await MemberVote.find({
    bioguideId,
    billSlug: { $in: allUserSlugs },
  }).lean();

  let matching = 0;
  let total = 0;

  for (const mv of memberVotes) {
    if (mv.vote !== "Yea" && mv.vote !== "Nay") continue;
    const userPosition = yeaBillSlugs.includes(mv.billSlug) ? "Yea" : "Nay";
    total++;
    if (mv.vote === userPosition) matching++;
  }

  const score = total > 0 ? Math.round((matching / total) * 100) : null;
  return { score, matching, total };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/member-votes.ts
git commit -m "feat: add member vote caching and community/personal alignment score computation"
```

---

## Task 6: Create Trending/Top Bills Library

**Files:**
- Create: `lib/trending.ts`

- [ ] **Step 1: Create lib/trending.ts**

```typescript
// lib/trending.ts
import connectDB from "@/lib/db";
import BillVoteEvent from "@/models/BillVoteEvent";
import Bill from "@/models/Bill";

const HALF_LIFE_HOURS = 24;
const LAMBDA = Math.LN2 / HALF_LIFE_HOURS;

interface TrendingBill {
  billSlug: string;
  congress: string;
  title: string;
  trendingScore: number;
  totalVotes: number;
}

interface TopBill {
  billSlug: string;
  congress: string;
  title: string;
  voteCount: number;
}

/**
 * Get trending bills ranked by engagement velocity with exponential time decay.
 * Score = sum of e^(-λ * hoursAgo) for each vote event.
 */
export async function getTrendingBills(limit = 20): Promise<TrendingBill[]> {
  await connectDB();

  const now = new Date();
  // Only consider votes from the last 7 days (older votes contribute ~0)
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const events = await BillVoteEvent.find({ votedAt: { $gte: cutoff } })
    .select("billSlug congress votedAt")
    .lean();

  // Group by billSlug and compute decayed score
  const scoreMap = new Map<string, { congress: string; score: number; count: number }>();

  for (const event of events) {
    const hoursAgo = (now.getTime() - new Date(event.votedAt).getTime()) / (1000 * 60 * 60);
    const contribution = Math.exp(-LAMBDA * hoursAgo);
    const existing = scoreMap.get(event.billSlug);
    if (existing) {
      existing.score += contribution;
      existing.count++;
    } else {
      scoreMap.set(event.billSlug, {
        congress: event.congress,
        score: contribution,
        count: 1,
      });
    }
  }

  // Sort by score descending
  const sorted = [...scoreMap.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit);

  if (sorted.length === 0) return [];

  // Fetch bill titles
  const slugs = sorted.map(([slug]) => slug);
  const bills = await Bill.find({ billSlug: { $in: slugs } })
    .select("billSlug congress title")
    .lean();
  const titleMap = new Map(bills.map((b) => [b.billSlug, { title: b.title, congress: b.congress }]));

  return sorted.map(([slug, data]) => ({
    billSlug: slug,
    congress: titleMap.get(slug)?.congress || data.congress,
    title: titleMap.get(slug)?.title || slug,
    trendingScore: Math.round(data.score * 100) / 100,
    totalVotes: data.count,
  }));
}

/**
 * Get top bills by total vote count within a time period.
 */
export async function getTopBills(
  period: "day" | "week" | "month" | "year",
  limit = 50
): Promise<TopBill[]> {
  await connectDB();

  const now = new Date();
  const periodMs: Record<string, number> = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };
  const cutoff = new Date(now.getTime() - periodMs[period]);

  const results = await BillVoteEvent.aggregate([
    { $match: { votedAt: { $gte: cutoff } } },
    { $group: { _id: "$billSlug", congress: { $first: "$congress" }, voteCount: { $sum: 1 } } },
    { $sort: { voteCount: -1 } },
    { $limit: limit },
  ]);

  if (results.length === 0) return [];

  const slugs = results.map((r: { _id: string }) => r._id);
  const bills = await Bill.find({ billSlug: { $in: slugs } })
    .select("billSlug congress title")
    .lean();
  const titleMap = new Map(bills.map((b) => [b.billSlug, { title: b.title, congress: b.congress }]));

  return results.map((r: { _id: string; congress: string; voteCount: number }) => ({
    billSlug: r._id,
    congress: titleMap.get(r._id)?.congress || r.congress,
    title: titleMap.get(r._id)?.title || r._id,
    voteCount: r.voteCount,
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/trending.ts
git commit -m "feat: add trending (exponential decay) and top bills aggregation library"
```

---

## Task 7: Update Vote API Route

**Files:**
- Modify: `app/api/vote/route.ts`

Add BillVoteEvent creation (synchronous) and trigger async member vote caching.

- [ ] **Step 1: Add imports at top of app/api/vote/route.ts**

After the existing imports, add:

```typescript
import BillVoteEvent from "@/models/BillVoteEvent";
import { cacheVotesAndRecomputeScores } from "@/lib/member-votes";
```

- [ ] **Step 2: Add BillVoteEvent creation and async cache trigger**

In the `POST` function, after the `Bill.findOneAndUpdate` / `Bill.create` block (after line 63 `}`), add before the `return NextResponse.json({ success: true });`:

```typescript
    // Create vote event for trending/top calculations
    await BillVoteEvent.create({ billSlug, congress, votedAt: new Date() });

    // Async: cache member votes and recompute alignment scores (non-blocking)
    cacheVotesAndRecomputeScores(billSlug, congress).catch((err) =>
      console.log("Async vote caching error:", err instanceof Error ? err.message : err)
    );
```

- [ ] **Step 3: Commit**

```bash
git add app/api/vote/route.ts
git commit -m "feat: create BillVoteEvent on vote and trigger async member vote caching"
```

---

## Task 8: Create Reusable UI Components (Avatar + AlignmentBadge)

**Files:**
- Create: `components/ui/Avatar.tsx`
- Create: `components/ui/AlignmentBadge.tsx`

- [ ] **Step 1: Create Avatar component**

```typescript
// components/ui/Avatar.tsx
"use client";

import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Avatar({ src, name, size = 64, className = "" }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-gold to-gold/70 flex items-center justify-center font-bold text-navy-900 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {getInitials(name)}
    </div>
  );
}
```

- [ ] **Step 2: Create AlignmentBadge component**

```typescript
// components/ui/AlignmentBadge.tsx
interface AlignmentBadgeProps {
  score: number | null;
  label: string;
  detail?: string;
  size?: "sm" | "lg";
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-cream/40";
  if (score >= 60) return "text-emerald-400";
  if (score >= 40) return "text-gold";
  return "text-red-400";
}

export default function AlignmentBadge({ score, label, detail, size = "sm" }: AlignmentBadgeProps) {
  const textSize = size === "lg" ? "text-2xl" : "text-xl";
  const labelSize = size === "lg" ? "text-xs" : "text-[0.65rem]";

  return (
    <div className="text-center">
      <p className={`${labelSize} uppercase tracking-wider text-cream/40`}>{label}</p>
      <p className={`${textSize} font-bold ${getScoreColor(score)} mt-0.5`}>
        {score !== null ? `${score}%` : "N/A"}
      </p>
      {detail && <p className="text-[0.7rem] text-cream/30 mt-0.5">{detail}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/Avatar.tsx components/ui/AlignmentBadge.tsx
git commit -m "feat: add reusable Avatar and AlignmentBadge UI components"
```

---

## Task 9: Create Avatar Upload API Route and Client Component

**Files:**
- Create: `app/api/user/avatar/route.ts`
- Create: `components/features/AvatarUpload.tsx`

- [ ] **Step 1: Create avatar upload API route**

```typescript
// app/api/user/avatar/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import cloudinary from "@/lib/cloudinary";

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const b64 = buffer.toString("base64");
    const dataURI = `data:${file.type};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "avatars",
      transformation: [{ width: 200, height: 200, crop: "fill", gravity: "face" }],
    });

    await User.findByIdAndUpdate(session.user.id, {
      avatar: result.secure_url,
    });

    return NextResponse.json({ avatar: result.secure_url });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create AvatarUpload client component**

```typescript
// components/features/AvatarUpload.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";

interface AvatarUploadProps {
  currentAvatar?: string | null;
  userName: string;
}

export default function AvatarUpload({ currentAvatar, userName }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/user/avatar", { method: "PATCH", body: formData });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar src={currentAvatar} name={userName} size={72} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="text-xs text-cream/50 hover:text-cream border border-glass-border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Edit Avatar"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/user/avatar/route.ts components/features/AvatarUpload.tsx
git commit -m "feat: add avatar upload API route and client component"
```

---

## Task 10: Persist Google Avatar on OAuth Login

**Files:**
- Modify: `lib/auth.ts`

- [ ] **Step 1: Update signIn callback to save Google avatar**

In `lib/auth.ts`, in the `signIn` callback, update the Google provider block. Replace:

```typescript
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectDB();
        const existingUser = await User.findOne({ email: user.email });
        if (!existingUser) {
          await User.create({
            email: user.email!,
            userName: user.name ?? user.email!,
            provider: "google",
          });
        }
      }
      return true;
    },
```

With:

```typescript
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        await connectDB();
        const existingUser = await User.findOne({ email: user.email });
        if (!existingUser) {
          await User.create({
            email: user.email!,
            userName: user.name ?? user.email!,
            provider: "google",
            avatar: (profile as { picture?: string })?.picture || null,
          });
        } else if (!existingUser.avatar && (profile as { picture?: string })?.picture) {
          existingUser.avatar = (profile as { picture?: string }).picture!;
          await existingUser.save();
        }
      }
      return true;
    },
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: persist Google profile picture as avatar on OAuth login"
```

---

## Task 11: Redesign ProfileHeader with Avatar and Rep Cards

**Files:**
- Modify: `components/features/ProfileHeader.tsx`
- Modify: `app/(dashboard)/profile/page.tsx`

- [ ] **Step 1: Rewrite ProfileHeader component**

Replace the entire content of `components/features/ProfileHeader.tsx`:

```typescript
// components/features/ProfileHeader.tsx
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import Avatar from "@/components/ui/Avatar";
import AlignmentBadge from "@/components/ui/AlignmentBadge";
import AvatarUpload from "@/components/features/AvatarUpload";

interface RepCard {
  id: string;
  name: string;
  party: string;
  role: string;
  imageUrl: string;
  alignment: { score: number | null; matching: number; total: number };
}

interface ProfileHeaderProps {
  user: {
    userName: string;
    state: string;
    cd: string;
    avatar?: string | null;
  };
  reps: RepCard[];
}

export default function ProfileHeader({ user, reps }: ProfileHeaderProps) {
  return (
    <div className="space-y-6">
      {/* User Header */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AvatarUpload currentAvatar={user.avatar} userName={user.userName} />
            <div>
              <h1 className="font-brand text-2xl sm:text-3xl text-gradient">
                {user.userName}
              </h1>
              <p className="text-cream/50 text-sm mt-1">
                {user.state}-{user.cd} Congressional District
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* My Representatives */}
      <div>
        <h2 className="text-[0.65rem] uppercase tracking-widest text-cream/40 mb-3">
          My Representatives
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {reps.map((rep) => (
            <Link key={rep.id} href={`/members/${rep.id}`}>
              <GlassCard hover className="text-center">
                <Avatar
                  src={rep.imageUrl}
                  name={rep.name}
                  size={64}
                  className="mx-auto mb-3 border-2 border-gold/30"
                />
                <p className="text-[0.65rem] uppercase tracking-wider text-cream/40">
                  {rep.role}
                </p>
                <p className="text-cream font-semibold text-sm mt-1">{rep.name}</p>
                <p className="text-cream/40 text-xs">{rep.party}</p>
                <div className="mt-3 pt-3 border-t border-glass-border">
                  <AlignmentBadge
                    score={rep.alignment.score}
                    label="Your Alignment"
                    detail={rep.alignment.total > 0 ? `${rep.alignment.matching}/${rep.alignment.total} votes` : undefined}
                  />
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update profile page to pass new data**

Replace the entire content of `app/(dashboard)/profile/page.tsx`:

```typescript
// app/(dashboard)/profile/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Post from "@/models/Post";
import Bill from "@/models/Bill";
import { fetchMembers } from "@/lib/congress";
import { computePersonalAlignment } from "@/lib/member-votes";
import ProfileHeader from "@/components/features/ProfileHeader";
import ProfileTabs from "@/components/features/ProfileTabs";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  await connectDB();

  const user = await User.findById(session.user.id).lean();
  if (!user) redirect("/login");

  const userState = user.state;
  const userCd = user.cd;

  if (!userState || !userCd) redirect("/onboarding");

  // Fetch House rep and senators
  const houseReps = await fetchMembers(userState, userCd);
  const allStateMembers = await fetchMembers(userState);
  const senators = allStateMembers.filter(
    (m) => !m.district || m.district === 0
  );

  const houseRep = houseReps.length > 0 ? houseReps[0] : null;

  // Build rep cards with alignment scores
  const allReps = [
    ...senators.slice(0, 2).map((s) => ({ ...s, role: "Senator" })),
    ...(houseRep ? [{ ...houseRep, role: "House Rep" }] : []),
  ];

  const reps = await Promise.all(
    allReps.map(async (rep) => {
      const alignment = await computePersonalAlignment(
        rep.id,
        user.yeaBillSlugs || [],
        user.nayBillSlugs || []
      );
      return {
        id: rep.id,
        name: rep.name,
        party: rep.party,
        role: rep.role,
        imageUrl: `https://www.congress.gov/img/member/${rep.id.toLowerCase()}_200.jpg`,
        alignment,
      };
    })
  );

  // Fetch user's posts
  const posts = await Post.find({ user: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  const serializedPosts = posts.map((p) => ({
    _id: p._id.toString(),
    title: p.title,
    image: p.image,
    caption: p.caption,
    likes: p.likes,
  }));

  // Fetch user's voted bills
  const votes: { bill: { _id: string; title: string; billSlug: string; congress: string } | null; position: "Yea" | "Nay" }[] = [];

  for (const slug of user.yeaBillSlugs || []) {
    const bill = await Bill.findOne({ billSlug: slug }).lean();
    votes.push({
      bill: bill
        ? {
            _id: bill._id.toString(),
            title: bill.title,
            billSlug: bill.billSlug,
            congress: bill.congress,
          }
        : null,
      position: "Yea",
    });
  }

  for (const slug of user.nayBillSlugs || []) {
    const bill = await Bill.findOne({ billSlug: slug }).lean();
    votes.push({
      bill: bill
        ? {
            _id: bill._id.toString(),
            title: bill.title,
            billSlug: bill.billSlug,
            congress: bill.congress,
          }
        : null,
      position: "Nay",
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <ProfileHeader
        user={{
          userName: user.userName,
          state: userState,
          cd: userCd,
          avatar: user.avatar || null,
        }}
        reps={reps}
      />

      <ProfileTabs votes={votes} posts={serializedPosts} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/features/ProfileHeader.tsx app/(dashboard)/profile/page.tsx
git commit -m "feat: redesign profile page with avatar, rep photos, and alignment scores"
```

---

## Task 12: Update Navbar

**Files:**
- Modify: `components/layout/Navbar.tsx`

- [ ] **Step 1: Update navLinks array**

In `components/layout/Navbar.tsx`, replace the `navLinks` array:

```typescript
  const navLinks = [
    { href: "/profile", label: "Profile" },
    { href: "/bills", label: "Bills" },
    { href: "/members", label: "Members" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/feed", label: "Feed" },
  ];
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/Navbar.tsx
git commit -m "feat: add Members to navbar, rename New Bills to Bills"
```

---

## Task 13: Create Member Directory Page

**Files:**
- Create: `components/features/MemberCard.tsx`
- Create: `components/features/MemberDirectory.tsx`
- Create: `app/(dashboard)/members/page.tsx`

- [ ] **Step 1: Create MemberCard component**

```typescript
// components/features/MemberCard.tsx
import Avatar from "@/components/ui/Avatar";

interface MemberCardProps {
  rank: number | null;
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district: number | null;
  chamber: string;
  communityScore: number | null;
  matchingVotes: number;
  totalCompared: number;
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-cream/30";
  if (score >= 60) return "text-emerald-400";
  if (score >= 40) return "text-gold";
  return "text-red-400";
}

export default function MemberCard({
  rank,
  bioguideId,
  name,
  party,
  state,
  district,
  chamber,
  communityScore,
  matchingVotes,
  totalCompared,
}: MemberCardProps) {
  const prefix = chamber === "Senate" ? "Sen." : "Rep.";
  const location = chamber === "Senate" ? state : `${state}-${district}`;
  const isNA = communityScore === null;

  return (
    <div
      className={`glass-card glass-hover flex items-center gap-3 sm:gap-4 py-3 px-4 ${
        isNA ? "opacity-50" : ""
      }`}
    >
      <span
        className={`font-bold text-sm w-8 text-center shrink-0 ${
          rank === 1 ? "text-gold" : "text-cream/40"
        }`}
      >
        {rank !== null ? `#${rank}` : "—"}
      </span>
      <Avatar
        src={`https://www.congress.gov/img/member/${bioguideId.toLowerCase()}_200.jpg`}
        name={name}
        size={44}
        className="border-2 border-gold/20 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-cream text-sm font-semibold truncate">
          {prefix} {name}
        </p>
        <p className="text-cream/40 text-xs">
          {party} · {location} · {chamber}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-lg font-bold ${getScoreColor(communityScore)}`}>
          {communityScore !== null ? `${communityScore}%` : "N/A"}
        </p>
        {totalCompared > 0 && (
          <p className="text-[0.6rem] text-cream/30">
            {matchingVotes}/{totalCompared} votes
          </p>
        )}
        {totalCompared === 0 && (
          <p className="text-[0.6rem] text-cream/20">no overlap</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create MemberDirectory client component**

```typescript
// components/features/MemberDirectory.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import MemberCard from "./MemberCard";

interface MemberData {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district: number | null;
  chamber: string;
  communityScore: number | null;
  matchingVotes: number;
  totalCompared: number;
}

interface MemberDirectoryProps {
  members: MemberData[];
}

type SortOption = "alignment" | "name" | "state";

export default function MemberDirectory({ members }: MemberDirectoryProps) {
  const [search, setSearch] = useState("");
  const [chamber, setChamber] = useState<"All" | "House" | "Senate">("All");
  const [stateFilter, setStateFilter] = useState("All");
  const [partyFilter, setPartyFilter] = useState("All");
  const [sort, setSort] = useState<SortOption>("alignment");

  const states = useMemo(() => {
    const s = [...new Set(members.map((m) => m.state))].sort();
    return ["All", ...s];
  }, [members]);

  const parties = useMemo(() => {
    const p = [...new Set(members.map((m) => m.party))].sort();
    return ["All", ...p];
  }, [members]);

  const filtered = useMemo(() => {
    let result = members;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }
    if (chamber !== "All") {
      result = result.filter((m) => m.chamber === chamber);
    }
    if (stateFilter !== "All") {
      result = result.filter((m) => m.state === stateFilter);
    }
    if (partyFilter !== "All") {
      result = result.filter((m) => m.party === partyFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sort === "alignment") {
        // N/A sorts to bottom
        if (a.communityScore === null && b.communityScore === null) return 0;
        if (a.communityScore === null) return 1;
        if (b.communityScore === null) return -1;
        return b.communityScore - a.communityScore;
      }
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "state") return a.state.localeCompare(b.state) || a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [members, search, chamber, stateFilter, partyFilter, sort]);

  // Assign ranks (only when sorted by alignment)
  const ranked = filtered.map((m, i) => ({
    ...m,
    rank: sort === "alignment" && m.communityScore !== null ? i + 1 : null,
  }));

  const selectClass =
    "bg-glass-bg border border-glass-border rounded-lg px-3 py-2 text-sm text-cream/70 focus:outline-none focus:border-gold/40";

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-glass-bg border border-glass-border rounded-lg px-3 py-2 text-sm text-cream placeholder:text-cream/40 focus:outline-none focus:border-gold/40"
        />
        <select
          value={chamber}
          onChange={(e) => setChamber(e.target.value as "All" | "House" | "Senate")}
          className={selectClass}
        >
          <option value="All">All Chambers</option>
          <option value="House">House</option>
          <option value="Senate">Senate</option>
        </select>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className={selectClass}
        >
          {states.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "All States" : s}
            </option>
          ))}
        </select>
        <select
          value={partyFilter}
          onChange={(e) => setPartyFilter(e.target.value)}
          className={selectClass}
        >
          {parties.map((p) => (
            <option key={p} value={p}>
              {p === "All" ? "All Parties" : p}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className={selectClass}
        >
          <option value="alignment">Sort: Alignment</option>
          <option value="name">Sort: Name A-Z</option>
          <option value="state">Sort: State</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-cream/40 text-sm mb-4">
        {filtered.length} member{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Member list */}
      <div className="space-y-2">
        {ranked.map((m) => (
          <Link key={m.bioguideId} href={`/members/${m.bioguideId}`}>
            <MemberCard
              rank={m.rank}
              bioguideId={m.bioguideId}
              name={m.name}
              party={m.party}
              state={m.state}
              district={m.district}
              chamber={m.chamber}
              communityScore={m.communityScore}
              matchingVotes={m.matchingVotes}
              totalCompared={m.totalCompared}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create member directory page**

```typescript
// app/(dashboard)/members/page.tsx
import connectDB from "@/lib/db";
import MemberScore from "@/models/MemberScore";
import MemberDirectory from "@/components/features/MemberDirectory";

export default async function MembersPage() {
  await connectDB();

  const scores = await MemberScore.find()
    .sort({ communityScore: -1 })
    .lean();

  const members = scores.map((s) => ({
    bioguideId: s.bioguideId,
    name: s.name,
    party: s.party,
    state: s.state,
    district: s.district,
    chamber: s.chamber,
    communityScore: s.communityScore,
    matchingVotes: s.matchingVotes,
    totalCompared: s.totalCompared,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-brand text-3xl sm:text-4xl text-gradient mb-2">
        Congress Directory
      </h1>
      <p className="text-cream/40 text-sm mb-8">
        {members.length} members ranked by community alignment
      </p>
      <MemberDirectory members={members} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/features/MemberCard.tsx components/features/MemberDirectory.tsx app/(dashboard)/members/page.tsx
git commit -m "feat: add member directory page with leaderboard, filters, and search"
```

---

## Task 14: Create Member Profile Page

**Files:**
- Create: `components/features/MemberStats.tsx`
- Create: `components/features/MemberVoteList.tsx`
- Create: `components/features/MemberProfileHeader.tsx`
- Create: `app/(dashboard)/members/[bioguideId]/page.tsx`

- [ ] **Step 1: Create MemberStats component**

```typescript
// components/features/MemberStats.tsx
import GlassCard from "@/components/ui/GlassCard";
import AlignmentBadge from "@/components/ui/AlignmentBadge";

interface MemberStatsProps {
  communityScore: number | null;
  communityDetail: string;
  personalScore: number | null;
  personalDetail: string;
  tenure: string;
  tenureDetail: string;
}

export default function MemberStats({
  communityScore,
  communityDetail,
  personalScore,
  personalDetail,
  tenure,
  tenureDetail,
}: MemberStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <GlassCard className="text-center">
        <AlignmentBadge
          score={communityScore}
          label="Community Alignment"
          detail={communityDetail}
          size="lg"
        />
      </GlassCard>
      <GlassCard className="text-center">
        <AlignmentBadge
          score={personalScore}
          label="Your Alignment"
          detail={personalDetail}
          size="lg"
        />
      </GlassCard>
      <GlassCard className="text-center">
        <p className="text-xs uppercase tracking-wider text-cream/40">Tenure</p>
        <p className="text-2xl font-bold text-cream mt-0.5">{tenure}</p>
        <p className="text-[0.7rem] text-cream/30 mt-0.5">{tenureDetail}</p>
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 2: Create MemberVoteList component**

```typescript
// components/features/MemberVoteList.tsx
import Link from "next/link";

interface VoteEntry {
  billSlug: string;
  congress: string;
  title: string;
  memberVote: string;
  communityPosition: string;
  matches: boolean;
}

interface MemberVoteListProps {
  votes: VoteEntry[];
  showAll?: boolean;
  bioguideId?: string;
}

export default function MemberVoteList({ votes, showAll, bioguideId }: MemberVoteListProps) {
  if (votes.length === 0) {
    return (
      <p className="text-cream/40 text-sm">
        No voting overlap with community bills yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {votes.map((v) => (
        <div
          key={`${v.billSlug}-${v.congress}`}
          className="glass-card flex items-center justify-between py-3 px-4"
        >
          <div className="flex-1 min-w-0">
            <Link
              href={`/vote/${v.billSlug}/${v.congress}/voted`}
              className="text-cream text-sm font-medium hover:text-gold transition-colors line-clamp-1"
            >
              {v.title}
            </Link>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                v.memberVote === "Yea"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : v.memberVote === "Nay"
                  ? "bg-red-500/15 text-red-400"
                  : "bg-cream/10 text-cream/50"
              }`}
            >
              {v.memberVote}
            </span>
            <span className="text-cream/25 text-xs">
              Community: {v.communityPosition}
            </span>
            <span className={`text-sm ${v.matches ? "text-emerald-400" : "text-red-400"}`}>
              {v.matches ? "✓" : "✗"}
            </span>
          </div>
        </div>
      ))}
      {!showAll && bioguideId && (
        <Link
          href={`/members/${bioguideId}/votes`}
          className="block text-center text-gold text-sm hover:text-gold/80 transition-colors mt-4"
        >
          View full voting record →
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create MemberProfileHeader component**

```typescript
// components/features/MemberProfileHeader.tsx
import Image from "next/image";
import Link from "next/link";

interface MemberProfileHeaderProps {
  name: string;
  party: string;
  state: string;
  district?: number;
  chamber: string;
  imageUrl: string;
  website?: string;
  phone?: string;
  leadership?: string;
}

export default function MemberProfileHeader({
  name,
  party,
  state,
  district,
  chamber,
  imageUrl,
  website,
  phone,
  leadership,
}: MemberProfileHeaderProps) {
  const location = chamber === "Senate" ? state : `${state}-${district}`;

  return (
    <div>
      <Link href="/members" className="text-cream/30 text-sm hover:text-cream/50 transition-colors">
        ← Back to Directory
      </Link>
      <div className="flex gap-6 mt-4">
        <div className="w-[120px] h-[150px] rounded-xl overflow-hidden border-2 border-gold/30 shrink-0 bg-navy-800">
          <Image
            src={imageUrl}
            alt={name}
            width={120}
            height={150}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <p className="text-cream/40 text-xs uppercase tracking-widest">
            {chamber === "Senate" ? "Senator" : "Representative"} · {location}
          </p>
          <h1 className="font-brand text-2xl sm:text-3xl text-gradient mt-1">
            {name}
          </h1>
          <p className="text-cream/50 text-sm mt-1">
            {party}
            {leadership && <span className="text-cream/40"> · {leadership}</span>}
          </p>
          <div className="flex gap-3 mt-3">
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gold bg-gold/10 px-3 py-1.5 rounded-md border border-gold/20 hover:bg-gold/20 transition-colors"
              >
                Website ↗
              </a>
            )}
            {phone && (
              <span className="text-xs text-cream/40 px-3 py-1.5">{phone}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create member profile page**

```typescript
// app/(dashboard)/members/[bioguideId]/page.tsx
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import MemberScore from "@/models/MemberScore";
import MemberVote from "@/models/MemberVote";
import Bill from "@/models/Bill";
import { fetchMemberDetail } from "@/lib/congress";
import { computePersonalAlignment } from "@/lib/member-votes";
import { getTrendingBills } from "@/lib/trending";
import MemberProfileHeader from "@/components/features/MemberProfileHeader";
import MemberStats from "@/components/features/MemberStats";
import MemberVoteList from "@/components/features/MemberVoteList";
import GlassCard from "@/components/ui/GlassCard";

interface MemberProfilePageProps {
  params: Promise<{ bioguideId: string }>;
}

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
  const { bioguideId } = await params;

  await connectDB();

  const detail = await fetchMemberDetail(bioguideId);
  if (!detail) notFound();

  // Get precomputed community score
  const memberScore = await MemberScore.findOne({ bioguideId }).lean();

  // Get personal alignment if logged in
  const session = await auth();
  let personalAlignment = { score: null as number | null, matching: 0, total: 0 };
  if (session?.user?.id) {
    const user = await User.findById(session.user.id)
      .select("yeaBillSlugs nayBillSlugs")
      .lean();
    if (user) {
      personalAlignment = await computePersonalAlignment(
        bioguideId,
        user.yeaBillSlugs || [],
        user.nayBillSlugs || []
      );
    }
  }

  // Compute tenure
  let tenureYears = 0;
  let tenureDetail = "";
  if (detail.terms.length > 0) {
    const firstTerm = detail.terms[0];
    tenureYears = new Date().getFullYear() - firstTerm.startYear;
    tenureDetail = `${firstTerm.chamber} since ${firstTerm.startYear}`;
  }

  // Get votes on trending bills
  const trendingBills = await getTrendingBills(10);
  const trendingSlugs = trendingBills.map((b) => b.billSlug);

  const memberVotesOnTrending = await MemberVote.find({
    bioguideId,
    billSlug: { $in: trendingSlugs },
  }).lean();

  // Build vote entries with community position
  const bills = await Bill.find({ billSlug: { $in: trendingSlugs } })
    .select("billSlug title yeas nays")
    .lean();
  const billMap = new Map(bills.map((b) => [b.billSlug, b]));

  const trendingVotes = memberVotesOnTrending
    .filter((mv) => mv.vote === "Yea" || mv.vote === "Nay")
    .map((mv) => {
      const bill = billMap.get(mv.billSlug);
      const communityPosition = bill
        ? bill.yeas >= bill.nays ? "Yea" : "Nay"
        : "N/A";
      return {
        billSlug: mv.billSlug,
        congress: mv.congress,
        title: bill?.title || mv.billSlug,
        memberVote: mv.vote,
        communityPosition,
        matches: mv.vote === communityPosition,
      };
    });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <MemberProfileHeader
        name={detail.name}
        party={detail.party}
        state={detail.state}
        district={detail.district}
        chamber={detail.chamber}
        imageUrl={detail.imageUrl}
        website={detail.website}
        phone={detail.phone}
        leadership={detail.leadership}
      />

      <MemberStats
        communityScore={memberScore?.communityScore ?? null}
        communityDetail={
          memberScore && memberScore.totalCompared > 0
            ? `${memberScore.matchingVotes}/${memberScore.totalCompared} votes match`
            : "no overlap"
        }
        personalScore={personalAlignment.score}
        personalDetail={
          session
            ? personalAlignment.total > 0
              ? `${personalAlignment.matching}/${personalAlignment.total} of your votes`
              : "no overlap"
            : "Log in to see"
        }
        tenure={tenureYears > 0 ? `${tenureYears} yrs` : "< 1 yr"}
        tenureDetail={tenureDetail}
      />

      {/* Committees */}
      {detail.committees.length > 0 && (
        <div>
          <h2 className="text-[0.65rem] uppercase tracking-widest text-cream/40 mb-3">
            Committees
          </h2>
          <div className="flex flex-wrap gap-2">
            {detail.committees.map((c) => (
              <span
                key={c.name}
                className="bg-glass-bg border border-glass-border rounded-md px-3 py-1.5 text-cream/60 text-xs"
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sponsored Bills */}
      {detail.sponsoredBills.length > 0 && (
        <div>
          <h2 className="text-[0.65rem] uppercase tracking-widest text-cream/40 mb-3">
            Recently Sponsored Bills
          </h2>
          <div className="space-y-2">
            {detail.sponsoredBills.map((b) => (
              <GlassCard key={`${b.billSlug}-${b.congress}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cream text-sm font-medium">
                      {b.billSlug.toUpperCase()} — {b.title}
                    </p>
                    {b.introducedDate && (
                      <p className="text-cream/35 text-xs mt-0.5">
                        Introduced {b.introducedDate}
                      </p>
                    )}
                  </div>
                  {b.latestAction && (
                    <span className="text-cream/30 text-xs shrink-0 ml-4">
                      {b.latestAction.length > 50
                        ? b.latestAction.slice(0, 50) + "…"
                        : b.latestAction}
                    </span>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Votes on Trending Bills */}
      <div>
        <h2 className="text-[0.65rem] uppercase tracking-widest text-cream/40 mb-1">
          Votes on Trending Bills
        </h2>
        <p className="text-cream/30 text-xs mb-3">
          How this member voted on bills the community is engaging with
        </p>
        <MemberVoteList
          votes={trendingVotes}
          bioguideId={bioguideId}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/features/MemberStats.tsx components/features/MemberVoteList.tsx components/features/MemberProfileHeader.tsx app/(dashboard)/members/[bioguideId]/page.tsx
git commit -m "feat: add individual member profile page with stats, committees, and vote history"
```

---

## Task 15: Create Full Voting Record Page

**Files:**
- Create: `app/(dashboard)/members/[bioguideId]/votes/page.tsx`

- [ ] **Step 1: Create full voting record page**

```typescript
// app/(dashboard)/members/[bioguideId]/votes/page.tsx
import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
import MemberVote from "@/models/MemberVote";
import Bill from "@/models/Bill";
import { fetchMemberDetail } from "@/lib/congress";
import MemberVoteList from "@/components/features/MemberVoteList";
import Link from "next/link";

interface VotesPageProps {
  params: Promise<{ bioguideId: string }>;
}

export default async function MemberVotesPage({ params }: VotesPageProps) {
  const { bioguideId } = await params;

  await connectDB();

  const detail = await fetchMemberDetail(bioguideId);
  if (!detail) notFound();

  // Get all community-voted bills
  const communityBills = await Bill.find({
    $or: [{ yeas: { $gt: 0 } }, { nays: { $gt: 0 } }],
  })
    .select("billSlug title yeas nays")
    .lean();

  const communityBillSlugs = communityBills.map((b) => b.billSlug);
  const billMap = new Map(communityBills.map((b) => [b.billSlug, b]));

  // Get member's votes on those bills
  const memberVotes = await MemberVote.find({
    bioguideId,
    billSlug: { $in: communityBillSlugs },
  }).lean();

  const votes = memberVotes
    .filter((mv) => mv.vote === "Yea" || mv.vote === "Nay")
    .map((mv) => {
      const bill = billMap.get(mv.billSlug);
      const communityPosition = bill
        ? bill.yeas >= bill.nays ? "Yea" : "Nay"
        : "N/A";
      return {
        billSlug: mv.billSlug,
        congress: mv.congress,
        title: bill?.title || mv.billSlug,
        memberVote: mv.vote,
        communityPosition,
        matches: mv.vote === communityPosition,
      };
    });

  const prefix = detail.chamber === "Senate" ? "Sen." : "Rep.";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href={`/members/${bioguideId}`}
        className="text-cream/30 text-sm hover:text-cream/50 transition-colors"
      >
        ← Back to {prefix} {detail.name}
      </Link>
      <h1 className="font-brand text-2xl sm:text-3xl text-gradient mt-4 mb-2">
        {prefix} {detail.name} — Voting Record
      </h1>
      <p className="text-cream/40 text-sm mb-8">
        {votes.length} vote{votes.length !== 1 ? "s" : ""} on community bills
      </p>
      <MemberVoteList votes={votes} showAll />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(dashboard)/members/[bioguideId]/votes/page.tsx
git commit -m "feat: add full member voting record page"
```

---

## Task 16: Revamp Bills Page with Trending/Top/New Tabs

**Files:**
- Create: `components/features/BillsPageTabs.tsx`
- Create: `components/features/TrendingBillsList.tsx`
- Create: `components/features/TopBillsList.tsx`
- Modify: `app/(dashboard)/bills/page.tsx`
- Create: `app/api/bills/trending/route.ts`
- Create: `app/api/bills/top/route.ts`

- [ ] **Step 1: Create trending bills API route**

```typescript
// app/api/bills/trending/route.ts
import { NextResponse } from "next/server";
import { getTrendingBills } from "@/lib/trending";

export async function GET() {
  try {
    const bills = await getTrendingBills(50);
    return NextResponse.json({ bills });
  } catch (error) {
    console.error("Error fetching trending bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending bills" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create top bills API route**

```typescript
// app/api/bills/top/route.ts
import { NextResponse } from "next/server";
import { getTopBills } from "@/lib/trending";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "week") as "day" | "week" | "month" | "year";

    if (!["day", "week", "month", "year"].includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Must be day, week, month, or year" },
        { status: 400 }
      );
    }

    const bills = await getTopBills(period, 50);
    return NextResponse.json({ bills });
  } catch (error) {
    console.error("Error fetching top bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch top bills" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create TrendingBillsList component**

```typescript
// components/features/TrendingBillsList.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";

interface TrendingBill {
  billSlug: string;
  congress: string;
  title: string;
  trendingScore: number;
  totalVotes: number;
}

interface TrendingBillsListProps {
  userVotedSlugs: string[];
}

export default function TrendingBillsList({ userVotedSlugs }: TrendingBillsListProps) {
  const [bills, setBills] = useState<TrendingBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bills/trending")
      .then((r) => r.json())
      .then((data) => setBills(data.bills || []))
      .catch((err) => console.error("Failed to fetch trending:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass-card h-20 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <div className="glass-card text-center py-12">
        <p className="text-cream/60">No trending bills yet.</p>
        <p className="text-cream/40 text-sm mt-2">
          Bills will appear here as the community votes on them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bills.map((bill, i) => {
        const hasVoted = userVotedSlugs.includes(bill.billSlug);
        return (
          <GlassCard key={bill.billSlug} hover>
            <div className="flex items-center gap-4">
              <span className={`font-bold text-sm w-8 text-center shrink-0 ${i === 0 ? "text-gold" : "text-cream/40"}`}>
                #{i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-cream text-sm font-semibold line-clamp-2">
                  {bill.title}
                </h3>
                <p className="text-cream/40 text-xs mt-1">
                  {bill.totalVotes} community vote{bill.totalVotes !== 1 ? "s" : ""} recently
                </p>
              </div>
              <Link
                href={hasVoted ? `/vote/${bill.billSlug}/${bill.congress}/voted` : `/vote/${bill.billSlug}/${bill.congress}`}
                className={`text-sm font-medium shrink-0 ${hasVoted ? "text-gold" : "text-cream hover:text-gold"} transition-colors`}
              >
                {hasVoted ? "Voted ✓" : "Vote →"}
              </Link>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create TopBillsList component**

```typescript
// components/features/TopBillsList.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";

interface TopBill {
  billSlug: string;
  congress: string;
  title: string;
  voteCount: number;
}

type Period = "day" | "week" | "month" | "year";

interface TopBillsListProps {
  userVotedSlugs: string[];
}

export default function TopBillsList({ userVotedSlugs }: TopBillsListProps) {
  const [bills, setBills] = useState<TopBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("week");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bills/top?period=${period}`)
      .then((r) => r.json())
      .then((data) => setBills(data.bills || []))
      .catch((err) => console.error("Failed to fetch top bills:", err))
      .finally(() => setLoading(false));
  }, [period]);

  const periodLabels: Record<Period, string> = {
    day: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year",
  };

  return (
    <div>
      {/* Period filter */}
      <div className="flex gap-2 mb-6">
        {(["day", "week", "month", "year"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              period === p
                ? "bg-gold/20 text-gold border border-gold/30"
                : "bg-glass-bg text-cream/50 border border-glass-border hover:text-cream"
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card h-20 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className="text-cream/60">No bills with votes {periodLabels[period].toLowerCase()}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map((bill, i) => {
            const hasVoted = userVotedSlugs.includes(bill.billSlug);
            return (
              <GlassCard key={bill.billSlug} hover>
                <div className="flex items-center gap-4">
                  <span className={`font-bold text-sm w-8 text-center shrink-0 ${i === 0 ? "text-gold" : "text-cream/40"}`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-cream text-sm font-semibold line-clamp-2">
                      {bill.title}
                    </h3>
                    <p className="text-cream/40 text-xs mt-1">
                      {bill.voteCount} vote{bill.voteCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Link
                    href={hasVoted ? `/vote/${bill.billSlug}/${bill.congress}/voted` : `/vote/${bill.billSlug}/${bill.congress}`}
                    className={`text-sm font-medium shrink-0 ${hasVoted ? "text-gold" : "text-cream hover:text-gold"} transition-colors`}
                  >
                    {hasVoted ? "Voted ✓" : "Vote →"}
                  </Link>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create BillsPageTabs component**

```typescript
// components/features/BillsPageTabs.tsx
"use client";

import { useState } from "react";
import TrendingBillsList from "./TrendingBillsList";
import TopBillsList from "./TopBillsList";
import BillsInfiniteList from "./BillsInfiniteList";
import SearchBar from "@/components/ui/SearchBar";
import type { BillResult } from "@/types";

type Tab = "trending" | "top" | "new";

interface BillsPageTabsProps {
  initialNewBills: BillResult[];
  userVotedSlugs: string[];
}

export default function BillsPageTabs({
  initialNewBills,
  userVotedSlugs,
}: BillsPageTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("trending");

  const tabs: { id: Tab; label: string }[] = [
    { id: "trending", label: "Trending" },
    { id: "top", label: "Top" },
    { id: "new", label: "New" },
  ];

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-6 mb-6 border-b border-glass-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === tab.id
                ? "text-gold"
                : "text-cream/50 hover:text-cream"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "trending" && (
        <TrendingBillsList userVotedSlugs={userVotedSlugs} />
      )}
      {activeTab === "top" && (
        <TopBillsList userVotedSlugs={userVotedSlugs} />
      )}
      {activeTab === "new" && (
        <div>
          <SearchBar className="max-w-md mb-8" />
          {initialNewBills.length === 0 ? (
            <p className="text-cream/60">No bills available at this time.</p>
          ) : (
            <BillsInfiniteList
              initialBills={initialNewBills}
              userVotedSlugs={userVotedSlugs}
            />
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Update bills page to use new tabs**

Replace the entire content of `app/(dashboard)/bills/page.tsx`:

```typescript
// app/(dashboard)/bills/page.tsx
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import { searchBills } from "@/lib/congress";
import User from "@/models/User";
import BillsPageTabs from "@/components/features/BillsPageTabs";

export default async function BillsPage() {
  await connectDB();
  const session = await auth();

  const newBills = await searchBills(null);

  let userVotedSlugs: string[] = [];
  if (session?.user?.id) {
    const user = await User.findById(session.user.id).lean();
    if (user) {
      userVotedSlugs = [
        ...(user.yeaBillSlugs || []),
        ...(user.nayBillSlugs || []),
      ];
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-brand text-3xl sm:text-4xl text-gradient mb-6">
        Bills
      </h1>
      <BillsPageTabs
        initialNewBills={newBills}
        userVotedSlugs={userVotedSlugs}
      />
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add components/features/BillsPageTabs.tsx components/features/TrendingBillsList.tsx components/features/TopBillsList.tsx app/(dashboard)/bills/page.tsx app/api/bills/trending/route.ts app/api/bills/top/route.ts
git commit -m "feat: revamp bills page with Trending/Top/New tabs and API routes"
```

---

## Task 17: Seed MemberScore Data for Directory

The directory page reads from MemberScore, which only gets populated when users vote. We need a way to initially seed it with all current members so the directory isn't empty.

**Files:**
- Create: `scripts/seed-member-scores.ts`

- [ ] **Step 1: Create seed script**

```typescript
// scripts/seed-member-scores.ts
/**
 * Seed MemberScore collection with all current members of Congress.
 * Run with: npx tsx scripts/seed-member-scores.ts
 *
 * This populates the directory with all 535 members (communityScore: null)
 * so the directory page shows everyone, not just members who have been scored.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const CONGRESS_API = "https://api.congress.gov/v3";
const API_KEY = process.env.CONGRESS_KEY;
const MONGO_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

const MemberScoreSchema = new mongoose.Schema({
  bioguideId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  party: { type: String, required: true },
  state: { type: String, required: true },
  district: { type: Number, default: null },
  chamber: { type: String, required: true },
  communityScore: { type: Number, default: null },
  matchingVotes: { type: Number, default: 0 },
  totalCompared: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

const MemberScore =
  mongoose.models.MemberScore ||
  mongoose.model("MemberScore", MemberScoreSchema);

async function fetchAllMembers(): Promise<
  { bioguideId: string; name: string; party: string; state: string; district?: number; chamber: string }[]
> {
  const members: { bioguideId: string; name: string; party: string; state: string; district?: number; chamber: string }[] = [];
  let offset = 0;
  const limit = 250;

  while (true) {
    const url = `${CONGRESS_API}/member?currentMember=true&limit=${limit}&offset=${offset}&api_key=${API_KEY}&format=json`;
    const resp = await fetch(url);
    const data = await resp.json();
    const batch = data.members || [];

    if (batch.length === 0) break;

    for (const m of batch) {
      const terms = m.terms?.item || m.terms || [];
      const latestTerm = Array.isArray(terms) ? terms[terms.length - 1] : null;
      const chamber = latestTerm?.chamber === "Senate" ? "Senate" : "House";

      members.push({
        bioguideId: m.bioguideId || "",
        name: m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim(),
        party: m.partyName || "",
        state: m.state || "",
        district: m.district || undefined,
        chamber,
      });
    }

    offset += limit;
    if (batch.length < limit) break;
  }

  return members;
}

async function main() {
  if (!MONGO_URI) {
    console.error("No MONGODB_URI or DATABASE_URL found in .env.local");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  console.log("Fetching all current members from Congress.gov...");
  const members = await fetchAllMembers();
  console.log(`Found ${members.length} members`);

  const bulkOps = members
    .filter((m) => m.bioguideId)
    .map((m) => ({
      updateOne: {
        filter: { bioguideId: m.bioguideId },
        update: {
          $setOnInsert: {
            communityScore: null,
            matchingVotes: 0,
            totalCompared: 0,
          },
          $set: {
            name: m.name,
            party: m.party,
            state: m.state,
            district: m.district || null,
            chamber: m.chamber,
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

  const result = await MemberScore.bulkWrite(bulkOps);
  console.log(
    `Seeded: ${result.upsertedCount} new, ${result.modifiedCount} updated`
  );

  await mongoose.disconnect();
  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-member-scores.ts
git commit -m "feat: add seed script to populate MemberScore with all current members of Congress"
```

- [ ] **Step 3: Run the seed script**

```bash
npx tsx scripts/seed-member-scores.ts
```

Expected output: `Found 535 members` and `Seeded: 535 new, 0 updated`.

---

## Task 18: Verify and Fix Build

- [ ] **Step 1: Run the dev server and check for TypeScript/build errors**

```bash
npx next build
```

- [ ] **Step 2: Fix any type errors or import issues found**

Common things to check:
- All new model files import correctly
- `fetchMemberDetail` is properly exported from `lib/congress.ts`
- `params` is properly awaited in dynamic route pages (Next.js 16 requires `params: Promise<>`)
- `next.config.ts` includes congress.gov in remotePatterns

- [ ] **Step 3: Test the profile page**

Navigate to `/profile` in the browser. Verify:
- Avatar section renders (initials if no avatar)
- Rep cards show with Congress.gov photos
- Alignment scores show (N/A if no cached votes yet)

- [ ] **Step 4: Test the members directory**

Navigate to `/members`. Verify:
- All seeded members appear
- Filters and search work
- Sort by alignment shows N/A members at bottom
- Clicking a member navigates to their profile

- [ ] **Step 5: Test the member profile page**

Navigate to `/members/{any-bioguideId}`. Verify:
- Photo, bio, contact info renders
- Stats cards show
- Committees render as pills
- Sponsored bills section loads

- [ ] **Step 6: Test the bills page**

Navigate to `/bills`. Verify:
- Trending/Top/New tabs render
- Trending shows empty state initially
- Top shows period filter buttons
- New tab shows existing bills list with search

- [ ] **Step 7: Test voting flow**

Vote on a bill, then verify:
- BillVoteEvent is created (check MongoDB)
- Member votes start getting cached (check MemberVote collection)
- MemberScores start getting updated
- Trending page shows the bill

- [ ] **Step 8: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build and runtime issues from profile/directory/trending features"
```
