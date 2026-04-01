# Profile Enhancement, Member Directory & Bills Revamp

## Overview

Four connected features that transform the profile page from a simple info display into an engaging civic engagement hub, add a congressional member directory with community alignment leaderboard, and revamp the bills page with trending/top/new views.

## 1. Enhanced Profile Page (`/profile`)

### User Header
- **Avatar system**: Google OAuth photo (auto-saved on login) → user-uploaded photo (Cloudinary) → initials fallback (rendered client-side from `userName`)
- "Edit Avatar" button opens a Cloudinary upload flow (reuse existing Cloudinary integration from post images)
- **User Model change**: Add `avatar: String` field — stores Cloudinary URL or Google photo URL. Null means initials fallback.
- On Google OAuth login/signup, persist `profile.image` to `User.avatar` if `avatar` is not already set (don't overwrite a custom upload).

### My Representatives
- Single row of 3 cards: **Senator | Senator | House Rep**
- Each card displays:
  - Official Congress.gov bioguide portrait (circular crop): `https://www.congress.gov/img/member/{bioguideId_lowercase}_200.jpg`
  - Role label (SENATOR / HOUSE REP)
  - Name
  - Party
  - **Personal alignment score** — color-coded: green ≥60%, gold 40–59%, red <40%, "N/A" if no overlapping votes
- Cards are clickable links to `/members/[bioguideId]`
- On mobile: cards stack vertically (1 column)

### Existing Tabs
- Votes and Posts tabs remain unchanged.

## 2. Member Directory (`/members`)

### Layout
- All 535 current members loaded in a single scrollable list (no pagination).
- Leaderboard-style rows.

### Default Sort
- **Community alignment score, descending.** Members with N/A (no overlapping votes) sort to the bottom with dimmed styling and a dash instead of a rank number.

### Other Sort Options
- Name A–Z
- State

### Filters
- **Chamber**: House / Senate / All
- **State**: dropdown of all 50 states + territories
- **Party**: Democrat / Republican / Independent / All
- **Name search**: text input, filters as you type

### Each Row
- Rank number (#1 in gold, rest in neutral)
- Official portrait (circular, small)
- Name (prefixed with Sen./Rep.)
- Party · State (+ district for House) · Chamber
- Community alignment percentage (color-coded)
- Vote count denominator (e.g., "12/13 votes")
- Entire row is a link to `/members/[bioguideId]`

### Navigation
- Add "Members" to the main navbar.

## 3. Member Profile Page (`/members/[bioguideId]`)

### Hero Section
- Official bioguide portrait (rectangular, ~120x150)
- Chamber + State label (e.g., "Senator · New York")
- Full name (large, gradient text)
- Party + leadership role if applicable (from Congress.gov API terms data)
- Website link + phone number

### 3 Stat Cards (row)
- **Community Alignment**: percentage (color-coded) + "X/Y votes match"
- **Your Alignment**: percentage (color-coded) + "X/Y of your votes". Shows "Log in to see" for unauthenticated users.
- **Tenure**: years in office + "Chamber since YYYY". Computed from Congress.gov terms data.

### Committees
- Pill-style tags. Fetched from Congress.gov `/member/{bioguideId}` endpoint (committee assignments).

### Recently Sponsored Bills
- Latest 5 bills from Congress.gov sponsored-legislation endpoint.
- Each shows: bill number + title, introduced date, status badge (In Committee / Passed / Enacted / etc.)

### Votes on Trending Bills
- Top 10 currently trending bills (from the trending algorithm) that this member has a cached vote for.
- Each shows: bill title, member's vote (Yea/Nay badge), community position, match/mismatch indicator (✓/✗).

### Full Voting Record Link
- "View full voting record →" links to `/members/[bioguideId]/votes`
- That page shows the complete history of this member's votes on all community-voted bills (from MemberVote collection), with the same match/mismatch display.

## 4. Bills Page Revamp (`/bills`)

Replaces the current bills page. Navbar label changes from "New Bills" (or current label) to "Bills".

### Three Views (toggle at top)
1. **Trending** (default): Bills ranked by engagement velocity with exponential time decay.
2. **Top**: Bills ranked by total community vote count. Sub-filters: Day, Week, Month, Year.
3. **New**: Latest bills from Congress.gov API — existing search/browse functionality moved here.

### Trending Algorithm
- **Score formula**: For each BillVoteEvent, contribution = e^(−λt) where t = hours since vote, λ = ln(2)/24 (~24-hour half-life).
- **Trending score** = sum of all decayed contributions for that bill.
- **Behavior**: 100 votes today = high score. 99 votes tomorrow = still trending. 1 vote the next day = fading but lingers from residual. No votes for 3–4 days = effectively gone.
- **Computation**: MongoDB aggregation on BillVoteEvent collection. Cache results with short TTL (e.g., 5 minutes) for performance.

### Top View
- Count of BillVoteEvents within the selected time window (last 24h / 7d / 30d / 365d).
- Simple `$match` + `$group` + `$sort` aggregation.

### Search
- Text search remains available across all views via the existing search bar.

## Data Architecture

### New Model: `MemberVote`
```
{
  bioguideId: String,       // e.g., "S000148"
  billSlug: String,         // e.g., "hr1234"
  congress: String,         // e.g., "119"
  vote: String,             // "Yea" | "Nay" | "Not Voting" | "Present" | ...
  chamber: String,          // "House" | "Senate"
  fetchedAt: Date
}
Unique compound index: { bioguideId, billSlug, congress }
```

### New Model: `MemberScore`
```
{
  bioguideId: String,       // unique
  name: String,
  party: String,
  state: String,
  district: Number | null,  // null for senators
  chamber: String,          // "House" | "Senate"
  communityScore: Number | null,  // 0–100, null = N/A
  matchingVotes: Number,    // numerator
  totalCompared: Number,    // denominator (0 means N/A)
  updatedAt: Date
}
Index: { communityScore: -1 } for leaderboard sort
```

### New Model: `BillVoteEvent`
```
{
  billSlug: String,
  congress: String,
  votedAt: Date
}
Index: { billSlug: 1, votedAt: -1 }
Index: { votedAt: -1 }
```
One document created per community vote cast. Enables both trending (decay aggregation) and top (count by time window).

### Modified Model: `User`
```
+ avatar: String            // Cloudinary URL or Google photo URL, null = initials fallback
```

## Vote Flow (updated)

When a user casts a vote on a bill:

1. **Save user vote** — add billSlug to `yeaBillSlugs` or `nayBillSlugs` (existing)
2. **Update Bill counts** — increment `Bill.yeas` or `Bill.nays` (existing)
3. **Create BillVoteEvent** — `{ billSlug, congress, votedAt: new Date() }` (new)
4. **Async: Cache member votes** — Fetch roll call XML for this bill (one request per chamber). Each XML contains all member votes. Parse and bulk upsert into MemberVote. (new, non-blocking)
5. **Async: Recompute MemberScores** — For each member with a MemberVote on this bill, recalculate communityScore by comparing their cached votes against community majority (Bill.yeas vs Bill.nays) across all bills. Upsert MemberScore. (new, non-blocking)

Steps 4–5 run asynchronously so the voting user isn't blocked. If the roll call XML fetch fails (bill hasn't been voted on in Congress yet), skip silently — the MemberVote will be populated when it becomes available.

## Alignment Score Computation

### Community Alignment (precomputed in MemberScore)
For each bill where the community has voted AND the member has a cached MemberVote:
- Community majority = "Yea" if `Bill.yeas > Bill.nays`, else "Nay"
- Match if member's vote matches community majority (treating "Aye" as "Yea", "No" as "Nay")
- `communityScore = (matchingVotes / totalCompared) * 100`
- If `totalCompared === 0`, `communityScore = null` (N/A)

### Personal Alignment (computed at read time)
For each bill in the user's `yeaBillSlugs` + `nayBillSlugs` that the member has a MemberVote for:
- Match if member's vote matches user's vote
- `personalScore = (matches / total) * 100`
- Fast: just a DB query against cached MemberVotes, no API calls.

## Color Coding
- **Green** (`#4ade80`): score ≥ 60%
- **Gold** (`#f5c542`): score 40–59%
- **Red** (`#ef4444`): score < 40%
- **N/A**: dimmed text, no color

## Member Images
- Source: `https://www.congress.gov/img/member/{bioguideId_lowercase}_200.jpg`
- No local storage needed — hotlinked from Congress.gov (public domain images).
- Fallback: initials circle if image fails to load.

## API Endpoints (new)

Note: Existing routes use `/api/members/[state]` and `/api/members/[state]/[district]` for Congress.gov lookups. New member-by-bioguideId routes use `/api/member/` (singular) to avoid dynamic segment conflicts.

- `GET /api/member/[bioguideId]` — returns full member detail (Congress.gov API data + MemberScore + committees)
- `GET /api/member/[bioguideId]/votes` — returns all MemberVotes for this member on community bills
- `GET /api/member/[bioguideId]/alignment` — returns personal alignment score for authenticated user
- `GET /api/bills/trending` — returns bills ranked by trending score (cached)
- `GET /api/bills/top?period=day|week|month|year` — returns bills ranked by vote count in period
- `PATCH /api/user/avatar` — upload/update user avatar

The directory page (`/members`) and member profile page (`/members/[bioguideId]`) are server components that query MongoDB directly — no API route needed for the directory listing.

## Pages (new/modified)

| Route | Type | Description |
|-------|------|-------------|
| `/profile` | Modified | Enhanced with avatar + rep cards + alignment scores |
| `/members` | New | Directory leaderboard page |
| `/members/[bioguideId]` | New | Individual member profile |
| `/members/[bioguideId]/votes` | New | Full voting record |
| `/bills` | Modified | Trending/Top/New toggle (replaces current) |

## Navigation Changes
- Add "Members" to navbar
- Rename existing bills nav item to "Bills"
