// Route-cycle tests for the proposals API: auth gating, validation, and response
// shape. Uses a real MongoDB connection (per CLAUDE.md — no DB mocking) with the
// session seam (@/lib/auth's `auth`) mocked so we can drive authenticated and
// unauthenticated callers deterministically.
//
// NOTE: these hit the real `connectDB()` (DB_STRING). Point DB_STRING at a
// disposable test database before running — each test cleans the collections it
// touches in beforeEach so tests stay independent.
import { describe, it, expect, beforeEach, vi } from "vitest";
import connectDB from "@/lib/db";
import Proposal from "@/models/Proposal";
import User from "@/models/User";

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

beforeEach(async () => {
  await connectDB();
  await Proposal.deleteMany({});
  await User.deleteMany({ email: /@test\.local$/ });
  authMock.mockReset();
});

describe("POST /api/proposals", () => {
  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const { POST } = await import("../route");
    const form = new FormData();
    form.set("title", "x");
    form.set("description", "y");
    const res = await POST(
      new Request("http://t/api/proposals", { method: "POST", body: form })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when description missing", async () => {
    const u = await User.create({ email: "r@test.local", userName: "r", state: "TX", cd: "21" });
    authMock.mockResolvedValue({ user: { id: u._id.toString(), state: "TX", cd: "21" } });
    const { POST } = await import("../route");
    const form = new FormData();
    form.set("title", "only title");
    const res = await POST(
      new Request("http://t/api/proposals", { method: "POST", body: form })
    );
    expect(res.status).toBe(400);
  });

  it("creates a proposal (image optional) and returns 201 with its id", async () => {
    const u = await User.create({ email: "c@test.local", userName: "c", state: "TX", cd: "21" });
    authMock.mockResolvedValue({ user: { id: u._id.toString(), state: "TX", cd: "21" } });
    const { POST } = await import("../route");
    const form = new FormData();
    form.set("title", "Fix the potholes");
    form.set("description", "Repave Main St");
    const res = await POST(
      new Request("http://t/api/proposals", { method: "POST", body: form })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.proposal._id).toBeTruthy();

    const saved = await Proposal.findById(body.proposal._id).lean();
    expect(saved).not.toBeNull();
    expect(saved!.authorState).toBe("TX");
    expect(saved!.authorDistrict).toBe("21");
    expect(saved!.upvoteCount).toBe(0);
    expect(saved!.image).toBeUndefined();
  });
});

describe("GET /api/proposals", () => {
  it("returns proposals sorted Top with no user IDs leaked, and computes hasUpvoted", async () => {
    const author = await User.create({ email: "a@test.local", userName: "alice", state: "TX", cd: "21" });
    const voter = await User.create({ email: "b@test.local", userName: "bob", state: "CA", cd: "12" });

    const { POST: CREATE } = await import("../route");
    const mkForm = (title: string) => {
      const f = new FormData();
      f.set("title", title);
      f.set("description", "d");
      return f;
    };

    authMock.mockResolvedValue({ user: { id: author._id.toString(), state: "TX", cd: "21" } });
    await CREATE(new Request("http://t/api/proposals", { method: "POST", body: mkForm("first") }));
    const r2 = await CREATE(
      new Request("http://t/api/proposals", { method: "POST", body: mkForm("second") })
    );
    const secondId = (await r2.json()).proposal._id;

    // Bob upvotes the second proposal so it should rank first under Top.
    const { POST: UPVOTE } = await import("../[id]/upvote/route");
    authMock.mockResolvedValue({ user: { id: voter._id.toString(), state: "CA", cd: "12" } });
    await UPVOTE(new Request("http://t/api/proposals", { method: "POST" }), {
      params: Promise.resolve({ id: secondId }),
    });

    // Bob lists proposals: second is first, and he has upvoted it.
    const { GET } = await import("../route");
    const res = await GET(new Request("http://t/api/proposals?sort=top"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.proposals[0]._id).toBe(secondId);
    expect(body.proposals[0].hasUpvoted).toBe(true);
    // Aggregate payload must not leak voter identities.
    expect(JSON.stringify(body)).not.toContain(voter._id.toString());
  });
});

describe("POST /api/proposals/[id]/upvote", () => {
  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const { POST } = await import("../[id]/upvote/route");
    const res = await POST(new Request("http://t", { method: "POST" }), {
      params: Promise.resolve({ id: "000000000000000000000000" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for an unknown proposal id", async () => {
    const u = await User.create({ email: "u@test.local", userName: "u", state: "TX", cd: "21" });
    authMock.mockResolvedValue({ user: { id: u._id.toString(), state: "TX", cd: "21" } });
    const { POST } = await import("../[id]/upvote/route");
    const res = await POST(new Request("http://t", { method: "POST" }), {
      params: Promise.resolve({ id: "000000000000000000000000" }),
    });
    expect(res.status).toBe(404);
  });

  it("toggles the upvote and returns the updated count", async () => {
    const author = await User.create({ email: "au@test.local", userName: "au", state: "TX", cd: "21" });
    const p = await Proposal.create({ title: "T", description: "D", user: author._id });
    const voter = await User.create({ email: "v@test.local", userName: "v", state: "CA", cd: "12" });
    authMock.mockResolvedValue({ user: { id: voter._id.toString(), state: "CA", cd: "12" } });
    const { POST } = await import("../[id]/upvote/route");

    const on = await POST(new Request("http://t", { method: "POST" }), {
      params: Promise.resolve({ id: String(p._id) }),
    });
    expect(on.status).toBe(200);
    expect(await on.json()).toEqual({ upvoteCount: 1, hasUpvoted: true });

    const off = await POST(new Request("http://t", { method: "POST" }), {
      params: Promise.resolve({ id: String(p._id) }),
    });
    expect(await off.json()).toEqual({ upvoteCount: 0, hasUpvoted: false });
  });
});

describe("DELETE /api/proposals/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const { DELETE } = await import("../[id]/route");
    const res = await DELETE(new Request("http://t", { method: "DELETE" }), {
      params: Promise.resolve({ id: "000000000000000000000000" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller is not the owner", async () => {
    const owner = await User.create({ email: "o@test.local", userName: "o", state: "TX", cd: "21" });
    const other = await User.create({ email: "x@test.local", userName: "x", state: "CA", cd: "12" });
    const p = await Proposal.create({ title: "T", description: "D", user: owner._id });
    authMock.mockResolvedValue({ user: { id: other._id.toString(), state: "CA", cd: "12" } });
    const { DELETE } = await import("../[id]/route");
    const res = await DELETE(new Request("http://t", { method: "DELETE" }), {
      params: Promise.resolve({ id: String(p._id) }),
    });
    expect(res.status).toBe(403);
    expect(await Proposal.findById(String(p._id))).not.toBeNull();
  });

  it("returns 404 for an unknown proposal id", async () => {
    const u = await User.create({ email: "d@test.local", userName: "d", state: "TX", cd: "21" });
    authMock.mockResolvedValue({ user: { id: u._id.toString(), state: "TX", cd: "21" } });
    const { DELETE } = await import("../[id]/route");
    const res = await DELETE(new Request("http://t", { method: "DELETE" }), {
      params: Promise.resolve({ id: "000000000000000000000000" }),
    });
    expect(res.status).toBe(404);
  });

  it("lets the owner delete and returns ok", async () => {
    const owner = await User.create({ email: "od@test.local", userName: "od", state: "TX", cd: "21" });
    const p = await Proposal.create({ title: "T", description: "D", user: owner._id });
    authMock.mockResolvedValue({ user: { id: owner._id.toString(), state: "TX", cd: "21" } });
    const { DELETE } = await import("../[id]/route");
    const res = await DELETE(new Request("http://t", { method: "DELETE" }), {
      params: Promise.resolve({ id: String(p._id) }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(await Proposal.findById(String(p._id))).toBeNull();
  });
});

describe("GET /api/proposals/[id]", () => {
  it("returns 404 for an unknown id", async () => {
    authMock.mockResolvedValue(null);
    const { GET } = await import("../[id]/route");
    const res = await GET(new Request("http://t"), {
      params: Promise.resolve({ id: "000000000000000000000000" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns the proposal detail with isOwner true for the author", async () => {
    const owner = await User.create({ email: "g@test.local", userName: "g", state: "TX", cd: "21" });
    const p = await Proposal.create({ title: "Detail", description: "D", user: owner._id });
    authMock.mockResolvedValue({ user: { id: owner._id.toString(), state: "TX", cd: "21" } });
    const { GET } = await import("../[id]/route");
    const res = await GET(new Request("http://t"), {
      params: Promise.resolve({ id: String(p._id) }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.proposal.title).toBe("Detail");
    expect(body.proposal.isOwner).toBe(true);
    expect(body.proposal.upvotesByState).toEqual({});
    expect(body.proposal.upvotesByDistrict).toEqual({});
  });
});
