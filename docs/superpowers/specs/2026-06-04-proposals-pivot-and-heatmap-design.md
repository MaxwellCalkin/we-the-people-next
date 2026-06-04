# Design Spec: "Posts" → Community Bill Proposals + Upvote Heat Map

- **Date:** 2026-06-04
- **Status:** Approved (design); pending spec review → implementation plan → workflow
- **Author:** Maxwell Calkin (with Claude)

## 1. Motivation

Today a "post" is a user's *opinion about an existing bill* (an image + caption hard-linked to a
Congress bill, created after voting). We are pivoting the core object: a post becomes a
**proposal for a new bill** — a way for community members to raise issues to their representation.
Proposals are upvoted by the community; the most-backed ones surface on public, geography-aware
ranking pages that representatives (or their staff) can browse. Each proposal also shows a **heat map
of where in the US people are upvoting it.**

## 2. Decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Proposal shape | **Lightweight**: title + description; image optional. No category field (deferred). |
| 2 | Rep visibility | **Global + per-constituency** ranking (national, by state, by district). |
| 3 | Likes model | **One vote per user**, toggleable upvote (integrity for ranking). |
| 4 | Rep access | **Public constituency pages** — no rep login/role. |
| 5 | Existing data | **Clean slate** — drop old posts + their comments. |
| 6 | Heat map granularity | **Both** — states ⇄ districts toggle. |
| 7 | Heat map build | **d3-geo + topojson-client**, we render the SVG ourselves. |

Cross-cutting principle (existing app convention, see memory `feedback_browse_friendly_defaults`):
**browse-friendly defaults** — a viewer's own state/district is a *starting default*, never a gate;
anyone can browse any state/district, and logged-out/location-less viewers default to Global.

## 3. Data model

### 3.1 `Proposal` (new — replaces `Post`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | headline of the proposed bill |
| `description` | string | yes | the idea/issue in plain language |
| `image` | string | no | Cloudinary secure URL (optional now) |
| `cloudinaryId` | string | no | for deletion cleanup |
| `user` | ObjectId → User | **yes** | author (was *not* required on `Post` — latent bug, fixed) |
| `authorState` | string | no | snapshot of author's `state` at creation |
| `authorDistrict` | string | no | snapshot of author's `cd` at creation |
| `upvoteCount` | number | yes (default 0) | denormalized total; **indexed** for ranking |
| `upvoters` | `[{ user: ObjectId, state: string, cd: string }]` | default `[]` | integrity (one per user) + correct bucket decrement on un-vote |
| `upvotesByState` | `Map<string, number>` | default `{}` | denormalized tally; feeds states heat map |
| `upvotesByDistrict` | `Map<string, number>` | default `{}` | key = `"<STATE>-<cd>"` (e.g. `"TX-21"`); feeds districts heat map |
| `createdAt` | Date | default now | |

**Dropped from `Post`:** `billSlug`, `billCongress`, required-`image`, raw `likes` (`caption` is renamed to
`description`; `title` kept).

**Indexes:**
- `{ upvoteCount: -1 }` — global Top ranking.
- `{ authorState: 1, authorDistrict: 1, upvoteCount: -1 }` — per-constituency Top ranking.
- `{ createdAt: -1 }` — New sort.

### 3.2 `Comment` (modified)

Re-point the association field `post` → `proposal` (ObjectId → Proposal). Everything else unchanged.
Old comments are dropped in the clean-slate cleanup.

### 3.3 `User` (unchanged)

Already has `state` and `cd`; the session exposes `session.user.state` / `session.user.cd`. Used to stamp
both proposal authorship and upvote location. Location is **not** required to propose or upvote
(browse-friendly): a vote with no resolvable state still counts in `upvoteCount`/`upvoters` but is
omitted from the map buckets.

## 4. Upvote semantics & integrity

Endpoint **`POST /api/proposals/[id]/upvote`** (auth required), toggle:

- **Upvote** (user not in `upvoters`): push `{ user, state, cd }`; `upvoteCount += 1`; increment
  `upvotesByState[state]` and `upvotesByDistrict["state-cd"]` (only when state/cd present).
- **Un-upvote** (user already in `upvoters`): remove the user's entry; `upvoteCount -= 1`; decrement the
  buckets **using the state/cd stored on the entry** (robust if the user later moved). Floor buckets at 0
  and delete zeroed keys.
- Returns `{ upvoteCount, hasUpvoted }`.
- `401` when unauthenticated; `404` when proposal not found.

This replaces the old spammable `PUT .../like` (`$inc: { likes: 1 }`).

## 5. Ranking board — `/proposals`

Replaces `/feed`. A server component reads ranked proposals; a small client control bar drives:

- **Scope:** Global · By State · By District.
- **Sort:** Top (by `upvoteCount` desc) · New (by `createdAt` desc). **Default: Top.**
- **Browse-friendly defaults:** scope pre-selects the viewer's own state/district when known; any
  state/district is selectable; logged-out/location-less → Global.

A prominent **"Propose a Bill"** CTA sits on this page and in the dashboard nav.

Query support on `GET /api/proposals`: `scope`, `state`, `district`, `sort`, `page`, `limit`.

## 6. Upvote heat map — `UpvoteHeatMap` (new)

- Lives on the **proposal detail page**; shows *this proposal's* upvote distribution.
- **States ⇄ Districts toggle.** States render from `us-atlas` (reliable). Districts render from a
  118th-Congress congressional-district topojson (see Risks §13 — **state-level is the guaranteed
  deliverable; districts depend on sourcing a clean CD topojson, else fast-follow**).
- Built with **d3-geo** (`geoAlbersUsa`) + **topojson-client** (`feature`); we render `<path>` elements in a
  `"use client"` component and control fills directly to match the glass/gold palette.
- **Color scale:** sequential, by **raw upvote count** for MVP (per-capita normalization noted as a later
  refinement). Zero-count regions use a neutral base fill.
- Fed **only** by `upvotesByState` / `upvotesByDistrict` aggregates — individual voter locations are never
  sent to the client.
- **Empty state:** below a small threshold of total upvotes, show "Not enough upvotes yet to map this"
  instead of a near-blank map.
- Component reconciles aggregate keys to topojson feature IDs (state-abbr↔FIPS lookup; districts zero-padded;
  at-large `cd` handled as `00`).

## 7. Creating proposals & retiring the old flow

- **New page `/proposals/new`** — first-class create form: title, description, optional image upload.
  Replaces the bill-scoped `CreatePostForm`.
- **Retire the vote-gated flow** on `app/(dashboard)/vote/[slug]/[congress]/voted/page.tsx`: remove the
  `Post` import, the `existingPost` lookup in the `Promise.all`, the "Create a Post" / "View Your Post" CTA
  card, and the inline `CreatePostSection`/`CreatePostForm` wrapper. Replace with a small
  "Have an idea? Propose a bill →" link to `/proposals/new` so the path isn't a dead end.

## 8. Detail page, comments, profile

- **`/proposal/[id]`** (replaces `/post/[id]`): title, author, **location badge** (e.g. "TX-21"),
  description, optional image, **toggle upvote button** (reflects `hasUpvoted`), **heat map**, comments,
  owner-only delete.
- **Comments stay** (discussion refines proposals). `CommentSection` keeps working against the proposal id;
  comments API param `postId` → `proposalId`.
- **Profile** (`ProfileTabs`): the **"Posts" tab becomes "Proposals"**, listing the user's own proposals via
  `ProposalCard`. `PostEntry` shape → `{ _id, title, description, image?, upvoteCount }`.

## 9. API contract

| Method + path | Auth | Request | Response | Errors |
|---|---|---|---|---|
| `GET /api/proposals` | optional | query: `scope`, `state`, `district`, `sort`, `page`, `limit` | `{ proposals: [{ _id, title, description, image?, upvoteCount, authorState, authorDistrict, user:{userName}, createdAt, hasUpvoted }], total }` | 500 |
| `POST /api/proposals` | **required** | multipart: `title`, `description`, optional `file` | `{ proposal }` (201) | 401, 400 (missing title/description) |
| `GET /api/proposals/[id]` | optional | — | `{ proposal: { ...fields, upvotesByState, upvotesByDistrict, hasUpvoted, isOwner } }` | 404 |
| `POST /api/proposals/[id]/upvote` | **required** | — (toggle) | `{ upvoteCount, hasUpvoted }` | 401, 404 |
| `DELETE /api/proposals/[id]` | **required** | — | `{ ok: true }` | 401, 403 (not owner), 404 |
| `GET/POST /api/comments/[proposalId]` | GET optional / POST required | as today | as today | as today |

`hasUpvoted`/`isOwner` are computed from the session when present, else `false`.

## 10. Naming & URL map

| Old | New |
|---|---|
| `models/Post.ts` | `models/Proposal.ts` (delete `Post.ts`) |
| `app/api/posts/route.ts` | `app/api/proposals/route.ts` |
| `app/api/posts/[id]/route.ts` | `app/api/proposals/[id]/route.ts` |
| `app/api/posts/[id]/like/route.ts` (PUT) | `app/api/proposals/[id]/upvote/route.ts` (POST, toggle) |
| `app/api/comments/[postId]/route.ts` | `app/api/comments/[proposalId]/route.ts` |
| `app/(dashboard)/feed/page.tsx` | `app/(dashboard)/proposals/page.tsx` |
| `app/(dashboard)/post/[id]/page.tsx` | `app/(dashboard)/proposal/[id]/page.tsx` |
| `components/features/PostCard.tsx` | `components/features/ProposalCard.tsx` |
| `components/features/CreatePostForm.tsx` | `components/features/ProposalForm.tsx` (standalone, no bill props) |
| `components/features/LikeButton.tsx` | `components/features/UpvoteButton.tsx` (toggle + `hasUpvoted`) |
| `components/features/DeletePostButton.tsx` | `components/features/DeleteProposalButton.tsx` |

Add a **`/feed` → `/proposals` redirect** (mechanism to be confirmed against Next 16 docs — `next.config`
redirects vs. a redirecting route; see Risks). Nav label "Feed" → "Proposals".

## 11. Data cleanup (clean slate)

One-time: drop the `posts` collection and the `comments` collection (old comments reference posts). The new
`proposals` collection starts empty. Document the exact step in the plan (a short script or a guarded admin
action); it must be explicit and reversible-by-restore (no silent data loss beyond the intended drop).

## 12. File-level change map

**New:**
- `models/Proposal.ts`
- `app/api/proposals/route.ts`, `app/api/proposals/[id]/route.ts`, `app/api/proposals/[id]/upvote/route.ts`
- `app/(dashboard)/proposals/page.tsx`, `app/(dashboard)/proposals/new/page.tsx`,
  `app/(dashboard)/proposal/[id]/page.tsx`
- `components/features/ProposalCard.tsx`, `ProposalForm.tsx`, `UpvoteButton.tsx`,
  `DeleteProposalButton.tsx`, `UpvoteHeatMap.tsx`, and a board control bar (e.g. `ProposalBoardControls.tsx`)
- `lib/proposals.ts` — ranking/scope query + serialization helpers (mirrors `lib/trending.ts`,
  `lib/member-votes.ts`; the tested seam)
- US topojson assets (states + congressional districts) under `public/` or imported module
- Tests: `lib/__tests__/proposals.test.ts`; API route tests for create/upvote/delete

**Edit:**
- `models/Comment.ts` (`post` → `proposal`)
- `app/api/comments/[proposalId]/route.ts` (renamed dir + field)
- `components/features/CommentSection.tsx` (prop name `postId` → `proposalId` if applicable)
- `app/(dashboard)/profile/page.tsx` (query proposals; pass to tabs)
- `components/features/ProfileTabs.tsx` ("Posts" → "Proposals"; `ProposalCard`)
- `app/(dashboard)/vote/[slug]/[congress]/voted/page.tsx` (retire create-post flow)
- `components/layout/Navbar.tsx` (label + CTA + link)
- `package.json` (add `d3-geo`, `topojson-client`, types)

**Delete:**
- `models/Post.ts`, `app/api/posts/**`, `app/(dashboard)/feed/**`, `app/(dashboard)/post/**`,
  `components/features/PostCard.tsx`, `CreatePostForm.tsx`, `LikeButton.tsx`, `DeletePostButton.tsx`

## 13. Tests (Vitest, real MongoDB — per project testing philosophy)

Behavior-level, real DB, precise assertions, independent tests:

- **Create proposal:** 401 when unauthenticated; 400 when title or description missing; success with image
  omitted (image truly optional); `authorState`/`authorDistrict` stamped from the session user.
- **Upvote toggle:** first call sets `hasUpvoted=true` and `upvoteCount=1`; second call returns to
  `hasUpvoted=false`, `upvoteCount=0`; one user counts once regardless of repeated calls; 401 when
  unauthenticated; 404 for unknown id.
- **Bucket correctness:** upvoting increments the correct `upvotesByState` *and* `upvotesByDistrict` key;
  un-voting decrements exactly the buckets it added even when the user's current location differs from the
  vote-time location; the client-facing payload contains **no** user IDs.
- **Ranking/scope (`lib/proposals.ts`):** Top sorts by `upvoteCount` desc; New by `createdAt` desc; State
  scope returns only matching `authorState`; District scope filters by `authorState`+`authorDistrict`.
- **Delete:** owner can delete (proposal + comments + Cloudinary image removed); non-owner gets 403;
  unauthenticated gets 401.

## 14. Out of scope (YAGNI — schema/board leave room for each)

Category/topic tags & filtering · authenticated rep dashboards/roles · "send to my rep" action ·
time-decayed "hot" ranking · per-capita map normalization. None require rework to add later.

## 15. Risks & research tasks (resolve in the workflow's research phase, before coding)

1. **Congressional-district topojson** — `us-atlas` covers states/counties/nation but **not** CDs. Source &
   validate a clean 118th-Congress CD topojson (size, licensing, GEOID scheme). If none is clean enough,
   ship states now and districts as a fast-follow (data is already captured per vote).
2. **`d3-geo` / `topojson-client` versions** — confirm current versions install and run under Next 16 /
   React 19 in a `"use client"` component (these are framework-agnostic, so low risk). Fallback: hand-rolled
   static SVG.
3. **`/feed` → `/proposals` redirect** — confirm the Next 16 idiom (per AGENTS.md: read
   `node_modules/next/dist/docs/` before writing config).
4. **API route test harness** — the repo has `lib` and component tests but no API-route tests yet; establish
   the pattern (import the route handler, invoke with a `Request`, real DB) as part of this work.

## 16. Implementation note

After spec review, an implementation plan (writing-plans) will decompose this, and the build will be driven
by a **multi-agent workflow**: a research phase (resolve §15) → parallel rebuild across model / API / board /
detail+map / profile+nav / cleanup → tests → verification with the live preview.
