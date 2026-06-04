// lib/proposals.ts — all proposal query/mutation logic (the tested seam).
// Mirrors lib/trending.ts conventions: connectDB() first, lean reads, serialize for the client.
import mongoose, { Types } from "mongoose";
import connectDB from "@/lib/db";
import Proposal, { IProposal } from "@/models/Proposal";
import Comment from "@/models/Comment";
import cloudinary from "@/lib/cloudinary";
import { districtKey } from "@/lib/usGeo";

export interface ViewerCtx {
  id?: string;
}

export interface CreateInput {
  title: string;
  description: string;
  image?: string;
  cloudinaryId?: string;
  author: { id: string; state?: string; cd?: string };
}

export interface SerializedProposal {
  _id: string;
  title: string;
  description: string;
  image?: string;
  upvoteCount: number;
  authorState: string;
  authorDistrict: string;
  user?: { userName?: string };
  createdAt: string;
  hasUpvoted: boolean;
}

export interface ProposalDetail extends SerializedProposal {
  isOwner: boolean;
  upvotesByState: Record<string, number>;
  upvotesByDistrict: Record<string, number>;
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
    ? (u as { userName?: string }).userName
    : undefined;
}

export function serializeProposal(p: IProposal, viewerId?: string): SerializedProposal {
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

export interface Voter {
  id: string;
  state?: string;
  cd?: string;
}

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
    if (existing.state && existing.cd) {
      bump(p.upvotesByDistrict, districtKey(existing.state, existing.cd), -1);
    }
  } else {
    p.upvoters.push({
      user: new mongoose.Types.ObjectId(voter.id),
      state: voter.state || "",
      cd: voter.cd || "",
    });
    p.upvoteCount += 1;
    if (voter.state) bump(p.upvotesByState, voter.state, +1);
    if (voter.state && voter.cd) {
      bump(p.upvotesByDistrict, districtKey(voter.state, voter.cd), +1);
    }
  }
  await p.save();
  return { upvoteCount: p.upvoteCount, hasUpvoted: idx < 0 };
}

export interface ListOpts {
  scope?: "global" | "state" | "district";
  state?: string;
  district?: string;
  sort?: "top" | "new";
  page?: number;
  limit?: number;
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
    Proposal.find(filter)
      .sort(sort as never)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "userName")
      .lean(),
    Proposal.countDocuments(filter),
  ]);
  return {
    proposals: docs.map((d) => serializeProposal(d as unknown as IProposal, opts.viewerId)),
    total,
  };
}

export async function getProposalById(id: string, viewerId?: string): Promise<ProposalDetail | null> {
  await connectDB();
  const p = await Proposal.findById(id).populate("user", "userName").lean();
  if (!p) return null;
  const base = serializeProposal(p as unknown as IProposal, viewerId);
  const ownerId =
    p.user && typeof p.user === "object" && "_id" in p.user
      ? String((p.user as { _id: unknown })._id)
      : String(p.user);
  const toObj = (m: unknown) =>
    m instanceof Map ? Object.fromEntries(m) : (m as Record<string, number>) || {};
  return {
    ...base,
    isOwner: viewerId ? ownerId === viewerId : false,
    upvotesByState: toObj(p.upvotesByState),
    upvotesByDistrict: toObj(p.upvotesByDistrict),
  };
}

export async function deleteProposal(
  id: string,
  userId: string
): Promise<"deleted" | "forbidden" | "notfound"> {
  await connectDB();
  const p = await Proposal.findById(id);
  if (!p) return "notfound";
  if (String(p.user) !== userId) return "forbidden";
  if (p.cloudinaryId) {
    try {
      await cloudinary.uploader.destroy(p.cloudinaryId);
    } catch {}
  }
  await Comment.deleteMany({ proposal: p._id });
  await p.deleteOne();
  return "deleted";
}
