// app/(dashboard)/members/[bioguideId]/votes/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
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

  // Get ALL cached member votes (not just community bills)
  const allMemberVotes = await MemberVote.find({ bioguideId })
    .sort({ fetchedAt: -1 })
    .lean();

  // Get all member's bill slugs to look up titles
  const memberBillSlugs = allMemberVotes.map((mv) => mv.billSlug);

  // Fetch ALL bills that this member voted on (for titles) + community bills (for scores)
  const allBills = await Bill.find({ billSlug: { $in: memberBillSlugs } })
    .select("billSlug title yeas nays")
    .lean();

  const billMap = new Map(allBills.map((b) => [b.billSlug, b]));

  // Build vote entries
  const votes = allMemberVotes
    .filter((mv) => mv.vote === "Yea" || mv.vote === "Nay")
    .map((mv) => {
      const bill = billMap.get(mv.billSlug);
      const hasCommunityVotes = bill && (bill.yeas > 0 || bill.nays > 0);
      const communityPosition = hasCommunityVotes
        ? bill.yeas >= bill.nays ? "Yea" : "Nay"
        : null;
      const matches = communityPosition ? mv.vote === communityPosition : null;
      const popularity = hasCommunityVotes ? bill.yeas + bill.nays : 0;

      return {
        billSlug: mv.billSlug,
        congress: mv.congress,
        title: bill?.title || mv.billSlug.toUpperCase(),
        memberVote: mv.vote,
        communityPosition,
        matches,
        popularity,
      };
    });

  // Sort: community bills first (by popularity desc), then non-community bills
  votes.sort((a, b) => b.popularity - a.popularity);

  // Get user's voted slugs for correct bill links
  const session = await auth();
  let userVotedSlugs: string[] = [];
  if (session?.user?.id) {
    const user = await User.findById(session.user.id)
      .select("yeaBillSlugs nayBillSlugs")
      .lean();
    if (user) {
      userVotedSlugs = [
        ...(user.yeaBillSlugs || []),
        ...(user.nayBillSlugs || []),
      ];
    }
  }

  const prefix = detail.chamber === "Senate" ? "Sen." : "Rep.";
  const communityCount = votes.filter((v) => v.communityPosition).length;

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
        {votes.length} vote{votes.length !== 1 ? "s" : ""} recorded
        {communityCount > 0 && ` · ${communityCount} on community bills`}
      </p>
      <MemberVoteList votes={votes} showAll userVotedSlugs={userVotedSlugs} />
    </div>
  );
}
