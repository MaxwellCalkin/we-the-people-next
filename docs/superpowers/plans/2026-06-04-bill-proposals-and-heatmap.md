# Community Bill Proposals + Upvote Heat Map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Project rule (AGENTS.md): before writing Next.js code, read the relevant guide under `node_modules/next/dist/docs/`.**

**Goal:** Replace the "opinion on an existing bill" Post with a community **Proposal** for a new bill — upvoted one-per-user, ranked globally and by state/district, with a per-proposal US heat map of where upvotes come from.

**Architecture:** Mongoose `Proposal` model with denormalized upvote tallies; a tested `lib/proposals.ts` seam holding all query/mutation logic; thin Next route handlers (`auth()` gate → lib call → response); client components for the board, create form, toggle upvote, and a d3-geo/topojson heat map fed only by aggregate tallies.

**Tech Stack:** Next 16 (App Router) · React 19 · Mongoose 9 · next-auth v5 · Cloudinary · Vitest (jsdom, real MongoDB via `DB_STRING`) · **new:** `d3-geo`, `topojson-client`.

Spec: `docs/superpowers/specs/2026-06-04-proposals-pivot-and-heatmap-design.md`.

---

## File Structure

**New**
- `models/Proposal.ts` — schema + indexes (the core object)
- `lib/proposals.ts` — all proposal logic (create/list/get/toggleUpvote/delete + serialization). The tested seam.
- `lib/__tests__/proposals.test.ts` — real-DB behavior tests
- `lib/usGeo.ts` — tiny static helpers: state-abbr↔FIPS, district key helpers (pure, unit-tested)
- `lib/__tests__/usGeo.test.ts`
- `app/api/proposals/route.ts` — GET list, POST create
- `app/api/proposals/[id]/route.ts` — GET one, DELETE
- `app/api/proposals/[id]/upvote/route.ts` — POST toggle
- `app/api/proposals/__tests__/proposals.route.test.ts` — route cycle (auth/validation/shape), real DB + mocked `auth()`
- `app/(dashboard)/proposals/page.tsx` — ranking board (server)
- `app/(dashboard)/proposals/new/page.tsx` — create page (server shell)
- `app/(dashboard)/proposal/[id]/page.tsx` — detail (server)
- `components/features/ProposalCard.tsx`
- `components/features/ProposalForm.tsx`
- `components/features/UpvoteButton.tsx`
- `components/features/DeleteProposalButton.tsx`
- `components/features/ProposalBoardControls.tsx` — scope/sort client controls
- `components/features/UpvoteHeatMap.tsx` — the map
- `public/maps/states-10m.json` — us-atlas states topojson
- `public/maps/cd-118.json` — congressional-district topojson (Phase 0 sources/validates)

**Modified**
- `models/Comment.ts` — `post` → `proposal`
- `app/api/comments/[proposalId]/route.ts` — renamed from `[postId]`; field `post`→`proposal`
- `components/features/CommentSection.tsx` — prop `postId`→`proposalId`
- `app/(dashboard)/profile/page.tsx` — query Proposal, serialize, pass `proposals`
- `components/features/ProfileTabs.tsx` — "Posts"→"Proposals" tab, `ProposalCard`
- `app/(dashboard)/vote/[slug]/[congress]/voted/page.tsx` — retire create-post flow; add "Propose a bill" link
- `components/layout/Navbar.tsx` — "Feed"→"Proposals"; add "Propose" CTA
- `package.json` — add `d3-geo`, `topojson-client`, `@types/d3-geo`, `@types/topojson-client`
- `next.config.*` — `/feed`→`/proposals` redirect (confirm idiom in Phase 0)

**Deleted**
- `models/Post.ts`
- `app/api/posts/route.ts`, `app/api/posts/[id]/route.ts`, `app/api/posts/[id]/like/route.ts`
- `app/api/comments/[postId]/route.ts` (becomes `[proposalId]`)
- `app/(dashboard)/feed/page.tsx`, `app/(dashboard)/post/[id]/page.tsx`
- `components/features/PostCard.tsx`, `CreatePostForm.tsx`, `LikeButton.tsx`, `DeletePostButton.tsx`

**Test DB note:** tests call the real `connectDB()` which needs `DB_STRING`. Point it at a disposable test database. Every test cleans the collections it touches in `beforeEach` (`deleteMany({})`) so tests are independent. No DB mocking (per CLAUDE.md).

---

## Phase 0 — Research & setup (BLOCKS all coding)

### Task 0: Validate dependencies, assets, and Next idioms

**Files:** `package.json`, `public/maps/*`, `next.config.*`

- [ ] **Step 1: Read the Next docs we depend on.** Read under `node_modules/next/dist/docs/`: route handlers, dynamic route segments (params are `Promise<…>` here), and redirects (`next.config` `redirects()` vs middleware). Note the exact redirect idiom for Next 16.
- [ ] **Step 2: Add libraries.**

```bash
npm install d3-geo topojson-client
npm install -D @types/d3-geo @types/topojson-client
```

Confirm they install cleanly under React 19 / Next 16 (they are framework-agnostic). If `d3-geo` somehow fails, fall back to the hand-rolled-SVG contingency (spec §13) — but expect success.

- [ ] **Step 3: Source map assets into `public/maps/`.**
  - States: us-atlas `states-10m.json` (e.g. from `node_modules/us-atlas` after `npm i -D us-atlas`, or the jsDelivr file). Verify it has `objects.states` and FIPS ids.
  - Congressional districts (118th): source a TopoJSON with per-district features keyed by 4-digit GEOID (state FIPS + district). Validate: file opens, `topojson.feature(...)` yields ~436 features, file size is acceptable to serve. **If no clean source is found, ship states only and mark the districts toggle "coming soon"; per-vote district data is still captured so a fast-follow needs no backfill.**
- [ ] **Step 4: Record findings** at the top of this plan file (versions installed, asset filenames + key scheme, redirect idiom). These feed Tasks 9 and 14.
- [ ] **Step 5: Commit.**

```bash
git add package.json package-lock.json public/maps
git commit -m "chore: add d3-geo/topojson-client and US map assets for proposal heat map"
```

---

## Phase 1 — Data layer

### Task 1: `Proposal` model

**Files:** Create `models/Proposal.ts`; Delete `models/Post.ts` (in Task 16 after references are gone).

- [ ] **Step 1: Write the model.**

```ts
// models/Proposal.ts
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IUpvoter {
  user: Types.ObjectId;
  state: string;
  cd: string;
}

export interface IProposal extends Document {
  title: string;
  description: string;
  image?: string;
  cloudinaryId?: string;
  user: Types.ObjectId;
  authorState: string;
  authorDistrict: string;
  upvoteCount: number;
  upvoters: IUpvoter[];
  upvotesByState: Map<string, number>;
  upvotesByDistrict: Map<string, number>;
  createdAt: Date;
}

const UpvoterSchema = new Schema<IUpvoter>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    state: { type: String, default: "" },
    cd: { type: String, default: "" },
  },
  { _id: false }
);

const ProposalSchema = new Schema<IProposal>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: false },
  cloudinaryId: { type: String, required: false },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  authorState: { type: String, default: "" },
  authorDistrict: { type: String, default: "" },
  upvoteCount: { type: Number, required: true, default: 0 },
  upvoters: { type: [UpvoterSchema], default: [] },
  upvotesByState: { type: Map, of: Number, default: {} },
  upvotesByDistrict: { type: Map, of: Number, default: {} },
  createdAt: { type: Date, default: Date.now },
});

ProposalSchema.index({ upvoteCount: -1 });
ProposalSchema.index({ authorState: 1, authorDistrict: 1, upvoteCount: -1 });
ProposalSchema.index({ createdAt: -1 });

const Proposal: Model<IProposal> =
  mongoose.models.Proposal || mongoose.model<IProposal>("Proposal", ProposalSchema);

export default Proposal;
```

- [ ] **Step 2: Commit.** `git add models/Proposal.ts && git commit -m "feat: Proposal model with upvote tallies"`

### Task 2: US-geo helpers (pure, the only district-key source of truth)

**Files:** Create `lib/usGeo.ts`, `lib/__tests__/usGeo.test.ts`

- [ ] **Step 1: Failing test.**

```ts
// lib/__tests__/usGeo.test.ts
import { describe, it, expect } from "vitest";
import { districtKey, stateToFips, fipsToState } from "../usGeo";

describe("usGeo", () => {
  it("builds a district key from state abbr + cd", () => {
    expect(districtKey("TX", "21")).toBe("TX-21");
    expect(districtKey("tx", "21")).toBe("TX-21"); // normalizes case
  });
  it("treats at-large/blank cd as 00", () => {
    expect(districtKey("AK", "")).toBe("AK-00");
    expect(districtKey("AK", "AL")).toBe("AK-00");
  });
  it("maps state abbr to 2-digit FIPS and back", () => {
    expect(stateToFips("CA")).toBe("06");
    expect(fipsToState("06")).toBe("CA");
    expect(stateToFips("ZZ")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, expect FAIL.** `npx vitest run lib/__tests__/usGeo.test.ts`
- [ ] **Step 3: Implement.** Create `lib/usGeo.ts` with a full 50-states + DC abbr↔FIPS table, plus:

```ts
// lib/usGeo.ts  (FIPS table abbreviated here — include all 50 states + DC)
const ABBR_TO_FIPS: Record<string, string> = {
  AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DE:"10",DC:"11",
  FL:"12",GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",KS:"20",KY:"21",
  LA:"22",ME:"23",MD:"24",MA:"25",MI:"26",MN:"27",MS:"28",MO:"29",MT:"30",
  NE:"31",NV:"32",NH:"33",NJ:"34",NM:"35",NY:"36",NC:"37",ND:"38",OH:"39",
  OK:"40",OR:"41",PA:"42",RI:"44",SC:"45",SD:"46",TN:"47",TX:"48",UT:"49",
  VT:"50",VA:"51",WA:"53",WV:"54",WI:"55",WY:"56",
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
```

- [ ] **Step 4: Run, expect PASS.** `npx vitest run lib/__tests__/usGeo.test.ts`
- [ ] **Step 5: Commit.** `git commit -am "feat: us-geo helpers (fips + district keys)"`

### Task 3: `lib/proposals.ts` — create + serialization (TDD)

**Files:** Create `lib/proposals.ts`, `lib/__tests__/proposals.test.ts`

Interface (the contract every route relies on):

```ts
export interface ViewerCtx { id?: string }
export interface CreateInput {
  title: string; description: string;
  image?: string; cloudinaryId?: string;
  author: { id: string; state?: string; cd?: string };
}
export interface SerializedProposal {
  _id: string; title: string; description: string; image?: string;
  upvoteCount: number; authorState: string; authorDistrict: string;
  user?: { userName?: string }; createdAt: string; hasUpvoted: boolean;
}
export interface ProposalDetail extends SerializedProposal {
  isOwner: boolean;
  upvotesByState: Record<string, number>;
  upvotesByDistrict: Record<string, number>;
}
```

- [ ] **Step 1: Failing test (create stamps author location; description required).**

```ts
// lib/__tests__/proposals.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Proposal from "@/models/Proposal";
import User from "@/models/User";
import { createProposal, listProposals, getProposalById, toggleUpvote, deleteProposal } from "@/lib/proposals";

let alice: string, bob: string;

beforeEach(async () => {
  await connectDB();
  await Proposal.deleteMany({});
  await User.deleteMany({ email: /@test\.local$/ });
  const a = await User.create({ email: "alice@test.local", userName: "alice", state: "TX", cd: "21" });
  const b = await User.create({ email: "bob@test.local", userName: "bob", state: "CA", cd: "12" });
  alice = a._id.toString(); bob = b._id.toString();
});

describe("createProposal", () => {
  it("stamps author state/district and starts at zero upvotes", async () => {
    const p = await createProposal({
      title: "Fix the potholes", description: "Repave Main St",
      author: { id: alice, state: "TX", cd: "21" },
    });
    expect(p.authorState).toBe("TX");
    expect(p.authorDistrict).toBe("21");
    expect(p.upvoteCount).toBe(0);
    expect(p.image).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, expect FAIL.** `npx vitest run lib/__tests__/proposals.test.ts`
- [ ] **Step 3: Implement `createProposal` + `serializeProposal`.**

```ts
// lib/proposals.ts
import connectDB from "@/lib/db";
import Proposal, { IProposal } from "@/models/Proposal";
import Comment from "@/models/Comment";
import cloudinary from "@/lib/cloudinary";
import { districtKey } from "@/lib/usGeo";
import type { Types } from "mongoose";

export interface CreateInput {
  title: string; description: string;
  image?: string; cloudinaryId?: string;
  author: { id: string; state?: string; cd?: string };
}

export async function createProposal(input: CreateInput) {
  await connectDB();
  return Proposal.create({
    title: input.title,
    description: input.description,
    image: input.image,
    cloudinaryId: input.cloudinaryId,
    user: input.author.id,
    authorState: input.author.state || "",
    authorDistrict: input.author.cd || "",
    upvoteCount: 0,
    upvoters: [],
    upvotesByState: {},
    upvotesByDistrict: {},
  });
}

function userName(u: unknown): string | undefined {
  return u && typeof u === "object" && "userName" in u
    ? (u as { userName?: string }).userName : undefined;
}

export function serializeProposal(p: IProposal, viewerId?: string) {
  const upvoters = (p.upvoters || []) as { user: Types.ObjectId }[];
  return {
    _id: String(p._id),
    title: p.title,
    description: p.description,
    image: p.image || undefined,
    upvoteCount: p.upvoteCount,
    authorState: p.authorState || "",
    authorDistrict: p.authorDistrict || "",
    user: { userName: userName(p.user) },
    createdAt: (p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)).toISOString(),
    hasUpvoted: viewerId ? upvoters.some((u) => String(u.user) === viewerId) : false,
  };
}
```

- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit.** `git commit -am "feat: createProposal + serialization"`

### Task 4: `lib/proposals.ts` — toggleUpvote with bucket integrity (TDD)

- [ ] **Step 1: Failing tests (one-per-user, toggle round-trip, correct buckets, decrement uses stored location).**

```ts
// append to lib/__tests__/proposals.test.ts
describe("toggleUpvote", () => {
  it("is one-per-user and toggles count + buckets", async () => {
    const p = await createProposal({ title: "T", description: "D", author: { id: alice, state: "TX", cd: "21" } });
    const id = String(p._id);

    let r = await toggleUpvote(id, { id: bob, state: "CA", cd: "12" });
    expect(r.upvoteCount).toBe(1);
    expect(r.hasUpvoted).toBe(true);

    // repeat call by same user toggles OFF (no double counting)
    r = await toggleUpvote(id, { id: bob, state: "CA", cd: "12" });
    expect(r.upvoteCount).toBe(0);
    expect(r.hasUpvoted).toBe(false);

    const fresh = await Proposal.findById(id).lean();
    expect(fresh!.upvoteCount).toBe(0);
    expect(Object.keys(fresh!.upvotesByState as object)).not.toContain("CA"); // zeroed key removed
  });

  it("increments the correct state and district buckets", async () => {
    const p = await createProposal({ title: "T", description: "D", author: { id: alice, state: "TX", cd: "21" } });
    await toggleUpvote(String(p._id), { id: bob, state: "CA", cd: "12" });
    const fresh = await Proposal.findById(String(p._id)).lean();
    const byState = fresh!.upvotesByState as unknown as Record<string, number>;
    const byDist = fresh!.upvotesByDistrict as unknown as Record<string, number>;
    expect(byState["CA"]).toBe(1);
    expect(byDist["CA-12"]).toBe(1);
  });

  it("decrements the bucket recorded at vote time even if the user later moved", async () => {
    const p = await createProposal({ title: "T", description: "D", author: { id: alice, state: "TX", cd: "21" } });
    await toggleUpvote(String(p._id), { id: bob, state: "CA", cd: "12" });   // voted from CA
    const r = await toggleUpvote(String(p._id), { id: bob, state: "NY", cd: "10" }); // now in NY
    expect(r.upvoteCount).toBe(0);
    const fresh = await Proposal.findById(String(p._id)).lean();
    const byState = fresh!.upvotesByState as unknown as Record<string, number>;
    expect(byState["CA"]).toBeUndefined(); // the CA bucket it created was the one decremented
    expect(byState["NY"]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement `toggleUpvote`.** Load the doc, mutate in JS (buckets are small), save. Use the location stored on the existing upvoter entry when removing.

```ts
// add to lib/proposals.ts
export interface Voter { id: string; state?: string; cd?: string }

function bump(map: Map<string, number>, key: string, delta: number) {
  const next = (map.get(key) || 0) + delta;
  if (next > 0) map.set(key, next);
  else map.delete(key);
}

export async function toggleUpvote(proposalId: string, voter: Voter) {
  await connectDB();
  const p = await Proposal.findById(proposalId);
  if (!p) return null;

  const idx = p.upvoters.findIndex((u) => String(u.user) === voter.id);
  if (idx >= 0) {
    const existing = p.upvoters[idx];
    p.upvoters.splice(idx, 1);
    p.upvoteCount = Math.max(0, p.upvoteCount - 1);
    if (existing.state) bump(p.upvotesByState, existing.state, -1);
    if (existing.state && existing.cd) bump(p.upvotesByDistrict, districtKey(existing.state, existing.cd), -1);
  } else {
    p.upvoters.push({ user: proposalId && (voter.id as unknown as Types.ObjectId), state: voter.state || "", cd: voter.cd || "" } as never);
    p.upvoteCount += 1;
    if (voter.state) bump(p.upvotesByState, voter.state, +1);
    if (voter.state && voter.cd) bump(p.upvotesByDistrict, districtKey(voter.state, voter.cd), +1);
  }
  await p.save();
  return { upvoteCount: p.upvoteCount, hasUpvoted: idx < 0 };
}
```

> Note for executor: push a proper `{ user: new mongoose.Types.ObjectId(voter.id), state, cd }`. Import `mongoose` and use `new mongoose.Types.ObjectId(voter.id)`; the inline cast above is shorthand — replace with the real ObjectId construction.

- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit.** `git commit -am "feat: toggleUpvote with per-state/district tally integrity"`

### Task 5: `lib/proposals.ts` — list (scope/sort), getById, delete (TDD)

- [ ] **Step 1: Failing tests.**

```ts
// append to lib/__tests__/proposals.test.ts
describe("listProposals", () => {
  it("sorts by upvoteCount desc for Top and filters by scope", async () => {
    const a = await createProposal({ title: "TX-a", description: "d", author: { id: alice, state: "TX", cd: "21" } });
    const b = await createProposal({ title: "CA-b", description: "d", author: { id: bob, state: "CA", cd: "12" } });
    await toggleUpvote(String(b._id), { id: alice, state: "TX", cd: "21" }); // b has 1 upvote

    const top = await listProposals({ scope: "global", sort: "top" });
    expect(top.proposals[0]._id).toBe(String(b._id)); // most upvotes first

    const tx = await listProposals({ scope: "state", state: "TX", sort: "new" });
    expect(tx.proposals.map((p) => p._id)).toEqual([String(a._id)]);

    const d = await listProposals({ scope: "district", state: "CA", district: "12", sort: "new" });
    expect(d.proposals.map((p) => p._id)).toEqual([String(b._id)]);
  });
});

describe("deleteProposal", () => {
  it("removes the proposal and its comments for the owner; rejects non-owners", async () => {
    const p = await createProposal({ title: "T", description: "D", author: { id: alice, state: "TX", cd: "21" } });
    await Comment.create({ comment: "hi", likes: 0, proposal: p._id });

    const denied = await deleteProposal(String(p._id), bob);
    expect(denied).toBe("forbidden");

    const ok = await deleteProposal(String(p._id), alice);
    expect(ok).toBe("deleted");
    expect(await Proposal.findById(String(p._id))).toBeNull();
    expect(await Comment.countDocuments({ proposal: p._id })).toBe(0);
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement `listProposals`, `getProposalById`, `deleteProposal`.**

```ts
// add to lib/proposals.ts
export interface ListOpts {
  scope?: "global" | "state" | "district";
  state?: string; district?: string;
  sort?: "top" | "new";
  page?: number; limit?: number;
  viewerId?: string;
}

export async function listProposals(opts: ListOpts) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (opts.scope === "state" && opts.state) filter.authorState = opts.state;
  if (opts.scope === "district" && opts.state && opts.district) {
    filter.authorState = opts.state;
    filter.authorDistrict = opts.district;
  }
  const sort = opts.sort === "new" ? { createdAt: -1 } : { upvoteCount: -1, createdAt: -1 };
  const limit = Math.min(opts.limit ?? 30, 100);
  const page = Math.max(opts.page ?? 1, 1);

  const [docs, total] = await Promise.all([
    Proposal.find(filter).sort(sort as never).skip((page - 1) * limit).limit(limit)
      .populate("user", "userName").lean(),
    Proposal.countDocuments(filter),
  ]);
  return { proposals: docs.map((d) => serializeProposal(d as unknown as IProposal, opts.viewerId)), total };
}

export async function getProposalById(id: string, viewerId?: string) {
  await connectDB();
  const p = await Proposal.findById(id).populate("user", "userName").lean();
  if (!p) return null;
  const base = serializeProposal(p as unknown as IProposal, viewerId);
  const ownerId = p.user && typeof p.user === "object" && "_id" in p.user
    ? String((p.user as { _id: unknown })._id) : String(p.user);
  const toObj = (m: unknown) => (m instanceof Map ? Object.fromEntries(m) : (m as Record<string, number>) || {});
  return {
    ...base,
    isOwner: viewerId ? ownerId === viewerId : false,
    upvotesByState: toObj(p.upvotesByState),
    upvotesByDistrict: toObj(p.upvotesByDistrict),
  };
}

export async function deleteProposal(id: string, userId: string): Promise<"deleted" | "forbidden" | "notfound"> {
  await connectDB();
  const p = await Proposal.findById(id);
  if (!p) return "notfound";
  if (String(p.user) !== userId) return "forbidden";
  if (p.cloudinaryId) { try { await cloudinary.uploader.destroy(p.cloudinaryId); } catch {} }
  await Comment.deleteMany({ proposal: p._id });
  await p.deleteOne();
  return "deleted";
}
```

- [ ] **Step 4: Run, expect PASS** (whole file: `npx vitest run lib/__tests__/proposals.test.ts`).
- [ ] **Step 5: Commit.** `git commit -am "feat: list/get/delete proposals"`

### Task 6: `Comment` model re-point

**Files:** Modify `models/Comment.ts`

- [ ] **Step 1:** Rename field `post` → `proposal`, `ref: "Post"` → `ref: "Proposal"`; update `IComment` (`post` → `proposal`). Leave `comment`, `likes`, `createdAt`.
- [ ] **Step 2: Commit.** `git commit -am "refactor: Comment references Proposal"`

---

## Phase 2 — API routes (thin; depend on Phase 1)

### Task 7: Proposals collection route (GET list + POST create)

**Files:** Create `app/api/proposals/route.ts`. (Read the route-handlers doc first.)

- [ ] **Step 1: Implement.**

```ts
// app/api/proposals/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import { listProposals, createProposal } from "@/lib/proposals";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const scope = (searchParams.get("scope") as "global" | "state" | "district") || "global";
    const result = await listProposals({
      scope,
      state: searchParams.get("state") || undefined,
      district: searchParams.get("district") || undefined,
      sort: (searchParams.get("sort") as "top" | "new") || "top",
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 30,
      viewerId: session?.user?.id,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("Error listing proposals:", e);
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await request.formData();
    const title = (form.get("title") as string)?.trim();
    const description = (form.get("description") as string)?.trim();
    const file = form.get("file") as File | null;
    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    let image: string | undefined, cloudinaryId: string | undefined;
    if (file && typeof file.arrayBuffer === "function" && file.size > 0) {
      const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      const res = await cloudinary.uploader.upload(`data:${file.type};base64,${b64}`);
      image = res.secure_url; cloudinaryId = res.public_id;
    }

    const proposal = await createProposal({
      title, description, image, cloudinaryId,
      author: { id: session.user.id, state: session.user.state, cd: session.user.cd },
    });
    return NextResponse.json({ proposal: { _id: String(proposal._id) } }, { status: 201 });
  } catch (e) {
    console.error("Error creating proposal:", e);
    return NextResponse.json({ error: "Failed to create proposal" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit.** `git commit -am "feat: /api/proposals GET+POST"`

### Task 8: Single-proposal route (GET + DELETE) and upvote route

**Files:** Create `app/api/proposals/[id]/route.ts`, `app/api/proposals/[id]/upvote/route.ts`

- [ ] **Step 1: Implement `[id]/route.ts`.**

```ts
// app/api/proposals/[id]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposalById, deleteProposal } from "@/lib/proposals";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const proposal = await getProposalById(id, session?.user?.id);
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ proposal });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await deleteProposal(id, session.user.id);
  if (result === "notfound") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Implement `[id]/upvote/route.ts`.**

```ts
// app/api/proposals/[id]/upvote/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toggleUpvote } from "@/lib/proposals";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await toggleUpvote(id, {
    id: session.user.id, state: session.user.state, cd: session.user.cd,
  });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Commit.** `git commit -am "feat: proposal GET/DELETE + upvote toggle routes"`

### Task 9: Route-cycle tests (auth/validation/shape)

**Files:** Create `app/api/proposals/__tests__/proposals.route.test.ts`

- [ ] **Step 1: Write tests** mocking `@/lib/auth`'s `auth` and exercising handlers with real DB.

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import connectDB from "@/lib/db";
import Proposal from "@/models/Proposal";
import User from "@/models/User";

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

beforeEach(async () => {
  await connectDB();
  await Proposal.deleteMany({});
  authMock.mockReset();
});

describe("POST /api/proposals", () => {
  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const { POST } = await import("../route");
    const form = new FormData(); form.set("title", "x"); form.set("description", "y");
    const res = await POST(new Request("http://t/api/proposals", { method: "POST", body: form }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when description missing", async () => {
    const u = await User.create({ email: "r@test.local", userName: "r", state: "TX", cd: "21" });
    authMock.mockResolvedValue({ user: { id: u._id.toString(), state: "TX", cd: "21" } });
    const { POST } = await import("../route");
    const form = new FormData(); form.set("title", "only title");
    const res = await POST(new Request("http://t/api/proposals", { method: "POST", body: form }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run, expect PASS.** `npx vitest run app/api/proposals/__tests__/proposals.route.test.ts`
- [ ] **Step 3: Commit.** `git commit -am "test: proposal route auth+validation cycle"`

### Task 10: Comments route rename + re-point

**Files:** Move `app/api/comments/[postId]/route.ts` → `app/api/comments/[proposalId]/route.ts`

- [ ] **Step 1:** Create the new path; param `postId`→`proposalId`; `Comment.create({ comment, likes: 0, proposal: proposalId })`. Delete the old `[postId]` directory.
- [ ] **Step 2: Commit.** `git commit -am "refactor: comments route keyed by proposalId"`

---

## Phase 3 — UI components (depend on API; parallelizable)

### Task 11: ProposalCard, DeleteProposalButton, CommentSection edit

**Files:** Create `components/features/ProposalCard.tsx`, `components/features/DeleteProposalButton.tsx`; Modify `components/features/CommentSection.tsx`

- [ ] **Step 1: `ProposalCard.tsx`** — image optional, show `upvoteCount` + location badge; link to `/proposal/[id]`.

```tsx
"use client";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { ArrowBigUp } from "lucide-react";

interface ProposalCardProps {
  proposal: {
    _id: string; title: string; description: string; image?: string;
    upvoteCount: number; authorState?: string; authorDistrict?: string;
    user?: { userName?: string };
  };
}

export default function ProposalCard({ proposal }: ProposalCardProps) {
  const loc = proposal.authorState
    ? `${proposal.authorState}${proposal.authorDistrict ? "-" + proposal.authorDistrict : ""}`
    : null;
  return (
    <GlassCard hover className="flex flex-col overflow-hidden !p-0">
      {proposal.image && (
        <div className="relative w-full aspect-video overflow-hidden rounded-t-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={proposal.image} alt={proposal.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-cream font-semibold text-sm mb-2 line-clamp-2">{proposal.title}</h3>
        <p className="text-cream/50 text-xs mb-4 line-clamp-3">{proposal.description}</p>
        <div className="mt-auto flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-cream/60 text-xs">
            <ArrowBigUp className="h-4 w-4" />{proposal.upvoteCount}
          </span>
          {loc && <span className="text-cream/40 text-xs">{loc}</span>}
        </div>
        <Link href={`/proposal/${proposal._id}`} className="mt-3 inline-block text-gold text-sm font-medium hover:text-gold/80 transition-colors">
          View Proposal &rarr;
        </Link>
      </div>
    </GlassCard>
  );
}
```

- [ ] **Step 2: `DeleteProposalButton.tsx`** — copy `DeletePostButton` behavior; prop `proposalId`; `fetch(`/api/proposals/${proposalId}`, { method: "DELETE" })`; redirect `/profile`.
- [ ] **Step 3: `CommentSection.tsx`** — rename prop `postId`→`proposalId`; `fetch(`/api/comments/${proposalId}`, …)`. Keep all UI identical otherwise.
- [ ] **Step 4: Commit.** `git commit -am "feat: ProposalCard, DeleteProposalButton; comments by proposalId"`

### Task 12: UpvoteButton (toggle)

**Files:** Create `components/features/UpvoteButton.tsx`

- [ ] **Step 1: Implement.**

```tsx
"use client";
import { useState } from "react";
import { ArrowBigUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface UpvoteButtonProps {
  proposalId: string; initialCount: number; initialUpvoted: boolean; canVote: boolean;
}

export default function UpvoteButton({ proposalId, initialCount, initialUpvoted, canVote }: UpvoteButtonProps) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [upvoted, setUpvoted] = useState(initialUpvoted);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!canVote) { router.push("/login"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/upvote`, { method: "POST" });
      if (res.ok) { const d = await res.json(); setCount(d.upvoteCount); setUpvoted(d.hasUpvoted); }
    } catch (e) { console.error("Error upvoting:", e); } finally { setLoading(false); }
  };

  return (
    <button onClick={handle} disabled={loading}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
        upvoted ? "border-gold/60 bg-gold/10 text-gold" : "border-glass-border text-cream/70 hover:text-gold hover:border-gold/40"}`}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowBigUp className={`h-4 w-4 ${upvoted ? "fill-current" : ""}`} />}
      <span>{count}</span><span className="text-xs font-normal">{upvoted ? "Upvoted" : "Upvote"}</span>
    </button>
  );
}
```

- [ ] **Step 2: Commit.** `git commit -am "feat: UpvoteButton toggle"`

### Task 13: ProposalForm (standalone create)

**Files:** Create `components/features/ProposalForm.tsx`

- [ ] **Step 1: Implement** (adapt `CreatePostForm`: no bill props; fields title + description + optional image; POST FormData to `/api/proposals`; on success `router.push("/proposal/" + data.proposal._id)`).

```tsx
"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import MagneticButton from "@/components/ui/MagneticButton";
import { Upload, Loader2 } from "lucide-react";

export default function ProposalForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setFile(f); const r = new FileReader(); r.onload = () => setPreview(r.result as string); r.readAsDataURL(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) { setError("Title and description are required."); return; }
    setLoading(true); setError("");
    try {
      const fd = new FormData(); fd.append("title", title); fd.append("description", description);
      if (file) fd.append("file", file);
      const res = await fetch("/api/proposals", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) { router.push(`/proposal/${data.proposal._id}`); router.refresh(); }
      else setError(data.error || "Failed to create proposal.");
    } catch { setError("An unexpected error occurred."); } finally { setLoading(false); }
  };

  return (
    <GlassCard>
      <h2 className="font-brand text-xl text-gradient mb-6">Propose a Bill</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-cream/70 text-sm mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-2 text-sm text-cream placeholder:text-cream/50 focus:outline-none focus:ring-2 focus:ring-gold/50"
            placeholder="What should the law be?" />
        </div>
        <div>
          <label className="block text-cream/70 text-sm mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6}
            className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-2 text-sm text-cream placeholder:text-cream/50 focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none"
            placeholder="Describe the issue and what you'd like done about it..." />
        </div>
        <div>
          <label className="block text-cream/70 text-sm mb-1">Image (optional)</label>
          <div onClick={() => fileRef.current?.click()} className="cursor-pointer border-2 border-dashed border-glass-border rounded-lg p-6 text-center hover:border-gold/50 transition-colors">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
            ) : (<div className="text-cream/50"><Upload className="h-8 w-8 mx-auto mb-2" /><p className="text-sm">Click to add an image</p></div>)}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <MagneticButton type="submit" disabled={loading}>
          {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Submitting...</span> : "Submit Proposal"}
        </MagneticButton>
      </form>
    </GlassCard>
  );
}
```

- [ ] **Step 2: Commit.** `git commit -am "feat: standalone ProposalForm"`

### Task 14: UpvoteHeatMap (d3-geo + topojson, states⇄districts)

**Files:** Create `components/features/UpvoteHeatMap.tsx`. (Uses assets from Task 0.)

- [ ] **Step 1: Implement** a client component that, per active layer, fetches the topojson from `/maps/*.json`, builds paths with `geoPath(geoAlbersUsa())`, and fills each feature by its value in the provided tally (state abbr via `fipsToState`; district via 4-digit GEOID → `"ST-cd"`). Show an empty state under a threshold.

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { fipsToState } from "@/lib/usGeo";

type Layer = "states" | "districts";
interface Props {
  byState: Record<string, number>;
  byDistrict: Record<string, number>;
  totalUpvotes: number;
  districtsAvailable?: boolean; // false if Task 0 couldn't source CD topojson
}
const MIN_TO_MAP = 3;

export default function UpvoteHeatMap({ byState, byDistrict, totalUpvotes, districtsAvailable = true }: Props) {
  const [layer, setLayer] = useState<Layer>("states");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [topo, setTopo] = useState<any>(null);

  useEffect(() => {
    const url = layer === "states" ? "/maps/states-10m.json" : "/maps/cd-118.json";
    let active = true;
    fetch(url).then((r) => r.json()).then((d) => { if (active) setTopo(d); });
    return () => { active = false; };
  }, [layer]);

  const values = layer === "states" ? byState : byDistrict;
  const max = Math.max(1, ...Object.values(values));
  const valueFor = (geoId: string): number => {
    if (layer === "states") { const ab = fipsToState(geoId.slice(0, 2)); return ab ? values[ab] || 0 : 0; }
    // district GEOID = 2-digit state FIPS + 2-digit district
    const ab = fipsToState(geoId.slice(0, 2)); const dist = String(parseInt(geoId.slice(2), 10)).padStart(2, "0");
    return ab ? values[`${ab}-${dist}`] || 0 : 0;
  };

  const { paths, fill } = useMemo(() => {
    if (!topo) return { paths: [] as { d: string; id: string }[], fill: (_: number) => "" };
    const objName = Object.keys(topo.objects)[0];
    const geo = feature(topo, topo.objects[objName]) as unknown as { features: { id: string; geometry: unknown }[] };
    const path = geoPath(geoAlbersUsa());
    const paths = geo.features.map((f) => ({ id: String(f.id), d: path(f as never) || "" }));
    const fill = (v: number) => v <= 0 ? "rgba(255,255,255,0.04)" : `rgba(212,175,55,${0.15 + 0.85 * (v / max)})`; // gold scale
    return { paths, fill };
  }, [topo, max]);

  if (totalUpvotes < MIN_TO_MAP) {
    return <p className="text-cream/40 text-sm text-center py-8">Not enough upvotes yet to map this proposal.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-brand text-lg text-cream">Where the support is</h3>
        <div className="inline-flex rounded-lg border border-glass-border overflow-hidden text-xs">
          <button onClick={() => setLayer("states")} className={`px-3 py-1 ${layer === "states" ? "bg-gold/15 text-gold" : "text-cream/60"}`}>States</button>
          <button disabled={!districtsAvailable} onClick={() => setLayer("districts")}
            className={`px-3 py-1 ${layer === "districts" ? "bg-gold/15 text-gold" : "text-cream/60"} disabled:opacity-40`}>
            Districts{!districtsAvailable && " (soon)"}
          </button>
        </div>
      </div>
      <svg viewBox="0 0 960 600" className="w-full h-auto">
        {paths.map((p) => <path key={p.id} d={p.d} fill={fill(valueFor(p.id))} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />)}
      </svg>
    </div>
  );
}
```

> Executor: confirm the topojson object names (`states`, and the CD object's key) and the `id` scheme during Task 0, and adjust `objName`/`valueFor` slicing to match the actual asset. If CD asset is unavailable, pass `districtsAvailable={false}` from the detail page.

- [ ] **Step 2: Commit.** `git commit -am "feat: UpvoteHeatMap (states/districts choropleth)"`

---

## Phase 4 — Pages, nav, redirect

### Task 15: Board, create page, detail page

**Files:** Create `app/(dashboard)/proposals/page.tsx`, `components/features/ProposalBoardControls.tsx`, `app/(dashboard)/proposals/new/page.tsx`, `app/(dashboard)/proposal/[id]/page.tsx`

- [ ] **Step 1: Board page** (server) — reads scope/sort/state/district from `searchParams`, defaults scope to the viewer's own state/district when present (browse-friendly: any value selectable), sort default "top"; renders `ProposalBoardControls` + a grid of `ProposalCard`. Include a prominent "Propose a Bill" link to `/proposals/new`. Use `listProposals(...)` from the lib. `export const dynamic = "force-dynamic"`.
- [ ] **Step 2: ProposalBoardControls** (client) — Global/State/District scope buttons + Top/New toggle that update the URL query (`useRouter().push`). For State/District, a `<select>` of states (and a district input/select). Defaults reflect the viewer’s location passed in as props.
- [ ] **Step 3: Create page** — server shell that `auth()`-guards (redirect `/login`) and renders `<ProposalForm />` inside the dashboard container.
- [ ] **Step 4: Detail page** — adapt `app/(dashboard)/post/[id]/page.tsx`: load via `getProposalById(id, session?.user?.id)`; render title, author, location badge, description, optional image, `<UpvoteButton …>`, `<UpvoteHeatMap byState=… byDistrict=… totalUpvotes={upvoteCount} districtsAvailable=… />`, `<CommentSection proposalId=… initialComments=… />` (fetch via `Comment.find({ proposal: id })`), and `<DeleteProposalButton>` when `isOwner`. Back link → `/proposals`.
- [ ] **Step 5: Commit.** `git commit -am "feat: proposals board, create page, detail page with heat map"`

### Task 16: Profile, ProfileTabs, voted page, Navbar, redirect; delete old files

**Files:** Modify `app/(dashboard)/profile/page.tsx`, `components/features/ProfileTabs.tsx`, `app/(dashboard)/vote/[slug]/[congress]/voted/page.tsx`, `components/layout/Navbar.tsx`, `next.config.*`; Delete old post files.

- [ ] **Step 1: Profile page** — replace `Post` import/query with `Proposal.find({ user: session.user.id }).sort({ createdAt: -1 }).lean()`; serialize `{ _id, title, image, description, upvoteCount }`; pass `proposals={serialized}` to `ProfileTabs`.
- [ ] **Step 2: ProfileTabs** — rename `posts`→`proposals` prop and `PostEntry`→`ProposalEntry` (`{ _id; title; image?; description; upvoteCount }`); tab label "Posts"→"Proposals"; render `ProposalCard` with `proposal={...}`.
- [ ] **Step 3: Voted page** — remove `import Post`, the `existingPost` entry in `Promise.all`, the "Post CTA" `GlassCard`, and the entire `CreatePostSection`/`CreatePostInlineWrapper`/`CreatePostForm` block. Replace the CTA card with a simple link: `Have an idea? <Link href="/proposals/new">Propose a bill →</Link>`.
- [ ] **Step 4: Navbar** — in `navLinks`, replace `{ href: "/feed", label: "Feed" }` with `{ href: "/proposals", label: "Proposals" }`. Add a "Propose" CTA link to `/proposals/new` (desktop actions area + mobile menu).
- [ ] **Step 5: Redirect** — add `/feed → /proposals` using the Next 16 idiom confirmed in Task 0 (`redirects()` in `next.config`).
- [ ] **Step 6: Delete** old files: `models/Post.ts`, `app/api/posts/**`, `app/(dashboard)/feed/**`, `app/(dashboard)/post/**`, `components/features/{PostCard,CreatePostForm,LikeButton,DeletePostButton}.tsx`. Then grep to confirm zero references remain: `rg -n "models/Post|/api/posts|PostCard|CreatePostForm|LikeButton|DeletePostButton|/feed\b|/post/"`.
- [ ] **Step 7: Commit.** `git commit -am "feat: wire proposals into profile/nav/voted; remove legacy post code"`

---

## Phase 5 — Cleanup & verification

### Task 17: Drop legacy collections (clean slate)

**Files:** Create `scripts/drop-legacy-posts.mjs` (one-time, explicit)

- [ ] **Step 1:** Write a small script that connects via `DB_STRING` and drops the `posts` and `comments` collections (old comments referenced posts). Guard with a `--confirm` flag so it can't run accidentally. Document running it once against production *after* deploy.

```js
// scripts/drop-legacy-posts.mjs — run: node scripts/drop-legacy-posts.mjs --confirm
import mongoose from "mongoose";
if (!process.argv.includes("--confirm")) { console.error("Refusing to run without --confirm"); process.exit(1); }
await mongoose.connect(process.env.DB_STRING);
for (const c of ["posts", "comments"]) {
  try { await mongoose.connection.db.dropCollection(c); console.log("dropped", c); }
  catch (e) { console.log("skip", c, e.codeName || e.message); }
}
await mongoose.disconnect();
```

- [ ] **Step 2: Commit.** `git commit -am "chore: one-time legacy posts/comments cleanup script"`

### Task 18: Full verification

- [ ] **Step 1: Lint.** `npm run lint` → no errors.
- [ ] **Step 2: Tests.** `npm test` (ensure `DB_STRING` points at a test DB) → all pass.
- [ ] **Step 3: Build.** `npm run build` → succeeds (catches RSC/client boundary issues, e.g. the map must be a client component).
- [ ] **Step 4: Live smoke (preview tools).** Start dev server; sign in; `/proposals/new` → create a proposal (no image) → redirected to detail; upvote (count→1, button toggles); create a few proposals from seeded users in different states, upvote them, confirm board **Top** ordering and **State/District** scope filtering; open a proposal with ≥3 upvotes and confirm the heat map renders and the **States⇄Districts** toggle works (or shows "soon" if CD asset deferred); confirm `/feed` redirects to `/proposals`; confirm Navbar shows "Proposals" + "Propose". Capture screenshots of the board and the heat map.
- [ ] **Step 5: Final commit.** `git commit -am "test: verify proposals + heat map end-to-end"`

---

## Self-Review (completed during planning)

- **Spec coverage:** §3 model→T1; §3.2 Comment→T6; §4 upvote integrity→T4; §5 board→T15; §6 heat map→T0/T14/T15; §7 create+retire→T13/T15/T16; §8 detail/comments/profile→T11/T15/T16; §9 API→T7–T10; §10 naming/URL+redirect→T16; §11 cleanup→T17; §13 tests→T2–T5,T9; §15 risks→T0. All covered.
- **Placeholder scan:** none ("(soon)" districts is an intended runtime state, gated by Task 0's data finding, not a code gap).
- **Type consistency:** `serializeProposal`/`ProposalDetail` shape consumed identically by routes (T7–T8) and pages (T15–T16); `toggleUpvote` returns `{ upvoteCount, hasUpvoted }` consumed by both the upvote route (T8) and `UpvoteButton` (T12); `districtKey`/`fipsToState` (T2) are the single source of truth used by `toggleUpvote` (T4) and `UpvoteHeatMap` (T14).
- **Known executor follow-ups (flagged inline):** real `mongoose.Types.ObjectId(voter.id)` in T4; reconcile topojson object names/id scheme in T0/T14.
