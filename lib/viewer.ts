// lib/viewer.ts — the signed-in person, as the site chrome needs them.
// Cached per request so layouts and pages can both call it.
import { cache } from "react";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { seatLabel } from "@/lib/format";

export interface Viewer {
  id: string;
  name: string;
  avatar: string | null;
  /** Upper-case state code, or "" when unknown. */
  state: string;
  cd: string;
  /** "PA-12" (or "VT at-large") when both state and district are known. */
  district?: string;
}

export type VotePosition = "Yea" | "Nay";

/** The viewer's own Yea/Nay votes keyed by bill slug ({} when signed out). */
export const getUserVotes = cache(async (): Promise<Record<string, VotePosition>> => {
  const session = await auth();
  if (!session?.user?.id) return {};
  await connectDB();
  const user = await User.findById(session.user.id).select("yeaBillSlugs nayBillSlugs").lean();
  const votes: Record<string, VotePosition> = {};
  for (const slug of user?.yeaBillSlugs ?? []) votes[slug] = "Yea";
  for (const slug of user?.nayBillSlugs ?? []) votes[slug] = "Nay";
  return votes;
});

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  let avatar: string | null = null;
  try {
    await connectDB();
    const dbUser = await User.findById(session.user.id).select("avatar").lean();
    avatar = dbUser?.avatar ?? null;
  } catch (err) {
    console.error("Viewer avatar lookup failed:", err instanceof Error ? err.message : err);
  }

  const state = (session.user.state ?? "").toUpperCase();
  const cd = session.user.cd ?? "";
  return {
    id: session.user.id,
    name: session.user.userName || session.user.email || "",
    avatar,
    state,
    cd,
    district: state && cd ? seatLabel("House", state, cd) : undefined,
  };
});
