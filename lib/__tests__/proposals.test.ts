// lib/__tests__/proposals.test.ts
// DB-integration tests (real MongoDB via DB_STRING). Each test cleans the
// collections it touches in beforeEach so tests are independent.
import { describe, it, expect, beforeEach } from "vitest";
import connectDB from "@/lib/db";
import Proposal from "@/models/Proposal";
import Comment from "@/models/Comment";
import User from "@/models/User";
import {
  createProposal,
  listProposals,
  getProposalById,
  toggleUpvote,
  deleteProposal,
} from "@/lib/proposals";

let alice: string, bob: string;

beforeEach(async () => {
  await connectDB();
  await Proposal.deleteMany({});
  await User.deleteMany({ email: /@test\.local$/ });
  const a = await User.create({ email: "alice@test.local", userName: "alice", state: "TX", cd: "21" });
  const b = await User.create({ email: "bob@test.local", userName: "bob", state: "CA", cd: "12" });
  alice = a._id.toString();
  bob = b._id.toString();
});

describe("createProposal", () => {
  it("stamps author state/district and starts at zero upvotes", async () => {
    const p = await createProposal({
      title: "Fix the potholes",
      description: "Repave Main St",
      author: { id: alice, state: "TX", cd: "21" },
    });
    expect(p.authorState).toBe("TX");
    expect(p.authorDistrict).toBe("21");
    expect(p.upvoteCount).toBe(0);
    expect(p.image).toBeUndefined();
  });
});

describe("toggleUpvote", () => {
  it("is one-per-user and toggles count + buckets", async () => {
    const p = await createProposal({
      title: "T",
      description: "D",
      author: { id: alice, state: "TX", cd: "21" },
    });
    const id = String(p._id);

    let r = await toggleUpvote(id, { id: bob, state: "CA", cd: "12" });
    expect(r!.upvoteCount).toBe(1);
    expect(r!.hasUpvoted).toBe(true);

    // repeat call by same user toggles OFF (no double counting)
    r = await toggleUpvote(id, { id: bob, state: "CA", cd: "12" });
    expect(r!.upvoteCount).toBe(0);
    expect(r!.hasUpvoted).toBe(false);

    const fresh = await Proposal.findById(id).lean();
    expect(fresh!.upvoteCount).toBe(0);
    expect(Object.keys(fresh!.upvotesByState as object)).not.toContain("CA"); // zeroed key removed
  });

  it("increments the correct state and district buckets", async () => {
    const p = await createProposal({
      title: "T",
      description: "D",
      author: { id: alice, state: "TX", cd: "21" },
    });
    await toggleUpvote(String(p._id), { id: bob, state: "CA", cd: "12" });
    const fresh = await Proposal.findById(String(p._id)).lean();
    const byState = fresh!.upvotesByState as unknown as Record<string, number>;
    const byDist = fresh!.upvotesByDistrict as unknown as Record<string, number>;
    expect(byState["CA"]).toBe(1);
    expect(byDist["CA-12"]).toBe(1);
  });

  it("decrements the bucket recorded at vote time even if the user later moved", async () => {
    const p = await createProposal({
      title: "T",
      description: "D",
      author: { id: alice, state: "TX", cd: "21" },
    });
    await toggleUpvote(String(p._id), { id: bob, state: "CA", cd: "12" }); // voted from CA
    const r = await toggleUpvote(String(p._id), { id: bob, state: "NY", cd: "10" }); // now in NY
    expect(r!.upvoteCount).toBe(0);
    const fresh = await Proposal.findById(String(p._id)).lean();
    const byState = fresh!.upvotesByState as unknown as Record<string, number>;
    expect(byState["CA"]).toBeUndefined(); // the CA bucket it created was the one decremented
    expect(byState["NY"]).toBeUndefined();
  });
});

describe("listProposals", () => {
  it("sorts by upvoteCount desc for Top and filters by scope", async () => {
    const a = await createProposal({
      title: "TX-a",
      description: "d",
      author: { id: alice, state: "TX", cd: "21" },
    });
    const b = await createProposal({
      title: "CA-b",
      description: "d",
      author: { id: bob, state: "CA", cd: "12" },
    });
    await toggleUpvote(String(b._id), { id: alice, state: "TX", cd: "21" }); // b has 1 upvote

    const top = await listProposals({ scope: "global", sort: "top" });
    expect(top.proposals[0]._id).toBe(String(b._id)); // most upvotes first

    const tx = await listProposals({ scope: "state", state: "TX", sort: "new" });
    expect(tx.proposals.map((p) => p._id)).toEqual([String(a._id)]);

    const d = await listProposals({ scope: "district", state: "CA", district: "12", sort: "new" });
    expect(d.proposals.map((p) => p._id)).toEqual([String(b._id)]);
  });
});

describe("getProposalById", () => {
  it("exposes aggregate buckets and ownership without leaking voter ids", async () => {
    const p = await createProposal({
      title: "T",
      description: "D",
      author: { id: alice, state: "TX", cd: "21" },
    });
    await toggleUpvote(String(p._id), { id: bob, state: "CA", cd: "12" });

    const asOwner = await getProposalById(String(p._id), alice);
    expect(asOwner!.isOwner).toBe(true);
    expect(asOwner!.upvotesByState["CA"]).toBe(1);
    expect(asOwner!.upvotesByDistrict["CA-12"]).toBe(1);
    expect(JSON.stringify(asOwner)).not.toContain(bob); // no raw voter ids in payload

    const asStranger = await getProposalById(String(p._id), bob);
    expect(asStranger!.isOwner).toBe(false);
  });
});

describe("deleteProposal", () => {
  it("removes the proposal and its comments for the owner; rejects non-owners", async () => {
    const p = await createProposal({
      title: "T",
      description: "D",
      author: { id: alice, state: "TX", cd: "21" },
    });
    await Comment.create({ comment: "hi", likes: 0, proposal: p._id });

    const denied = await deleteProposal(String(p._id), bob);
    expect(denied).toBe("forbidden");

    const ok = await deleteProposal(String(p._id), alice);
    expect(ok).toBe("deleted");
    expect(await Proposal.findById(String(p._id))).toBeNull();
    expect(await Comment.countDocuments({ proposal: p._id })).toBe(0);
  });
});
