// app/(dashboard)/profile/page.tsx
export const dynamic = "force-dynamic";

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

  // Build rep cards with alignment scores — Senator | Senator | House Rep
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
