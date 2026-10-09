// app/(dashboard)/profile/page.tsx
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Proposal from "@/models/Proposal";
import Bill from "@/models/Bill";
import { fetchRepresentatives } from "@/lib/congress";
import { computePersonalAlignment } from "@/lib/member-votes";
import { loginHref } from "@/lib/safe-redirect";
import ProfileHeader from "@/components/features/ProfileHeader";
import ProfileTabs from "@/components/features/ProfileTabs";

export const metadata: Metadata = { title: "My profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect(loginHref("/profile"));

  await connectDB();

  const user = await User.findById(session.user.id).lean();
  if (!user) redirect("/login");

  const userState = user.state;
  const userCd = user.cd;

  if (!userState || !userCd) redirect("/onboarding");

  // Senator | Senator | House member
  const { senators, houseRep } = await fetchRepresentatives(userState, userCd).catch(() => ({
    senators: [],
    houseRep: null,
  }));

  const allReps = [
    ...senators.map((s) => ({ ...s, role: "Senator" })),
    ...(houseRep ? [{ ...houseRep, role: "Representative" }] : []),
  ];

  const yeaSlugs = user.yeaBillSlugs || [];
  const naySlugs = user.nayBillSlugs || [];

  const [reps, proposals, votedBills] = await Promise.all([
    Promise.all(
      allReps.map(async (rep) => ({
        id: rep.id,
        name: rep.name,
        party: rep.party,
        role: rep.role,
        imageUrl: `https://www.congress.gov/img/member/${rep.id.toLowerCase()}_200.jpg`,
        alignment: await computePersonalAlignment(rep.id, yeaSlugs, naySlugs),
      }))
    ),
    Proposal.find({ user: session.user.id }).sort({ createdAt: -1 }).lean(),
    Bill.find({ billSlug: { $in: [...yeaSlugs, ...naySlugs] } })
      .select("title billSlug congress")
      .lean(),
  ]);

  const serializedProposals = proposals.map((p) => ({
    _id: p._id.toString(),
    title: p.title,
    image: p.image,
    description: p.description,
    upvoteCount: p.upvoteCount,
    authorState: p.authorState,
    authorDistrict: p.authorDistrict,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
  }));

  const billBySlug = new Map(votedBills.map((b) => [b.billSlug, b]));
  const toEntry = (slug: string, position: "Yea" | "Nay") => {
    const bill = billBySlug.get(slug);
    return {
      bill: bill ? { _id: bill._id.toString(), title: bill.title, billSlug: bill.billSlug, congress: bill.congress } : null,
      position,
    };
  };
  const votes = [...yeaSlugs.map((s) => toEntry(s, "Yea")), ...naySlugs.map((s) => toEntry(s, "Nay"))];

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6 lg:px-8">
      <ProfileHeader
        user={{
          userName: user.userName || session.user.email,
          state: userState,
          cd: userCd,
          avatar: user.avatar || null,
        }}
        reps={reps}
        voteCount={yeaSlugs.length + naySlugs.length}
        proposalCount={serializedProposals.length}
      />

      <ProfileTabs votes={votes} proposals={serializedProposals} />
    </div>
  );
}
