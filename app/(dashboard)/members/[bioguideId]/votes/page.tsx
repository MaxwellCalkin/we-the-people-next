// app/(dashboard)/members/[bioguideId]/votes/page.tsx
import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
import MemberVote from "@/models/MemberVote";
import Bill from "@/models/Bill";
import { fetchMemberDetail } from "@/lib/congress";
import { fetchBillDetails, getCurrentCongress } from "@/lib/congress";
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

  // Get community bills for priority sorting and community position
  const communityBills = await Bill.find({
    $or: [{ yeas: { $gt: 0 } }, { nays: { $gt: 0 } }],
  })
    .select("billSlug title yeas nays")
    .lean();

  const communityBillMap = new Map(
    communityBills.map((b) => [b.billSlug, b])
  );
  // Total community votes for sorting priority
  const communityPopularity = new Map(
    communityBills.map((b) => [b.billSlug, b.yeas + b.nays])
  );

  // Build vote entries, resolving titles from Bill collection or billSlug
  const votes = allMemberVotes
    .filter((mv) => mv.vote === "Yea" || mv.vote === "Nay")
    .map((mv) => {
      const communityBill = communityBillMap.get(mv.billSlug);
      const communityPosition = communityBill
        ? communityBill.yeas >= communityBill.nays ? "Yea" : "Nay"
        : null;
      const matches = communityPosition ? mv.vote === communityPosition : null;

      return {
        billSlug: mv.billSlug,
        congress: mv.congress,
        title: communityBill?.title || mv.billSlug.toUpperCase(),
        memberVote: mv.vote,
        communityPosition,
        matches,
        popularity: communityPopularity.get(mv.billSlug) || 0,
      };
    });

  // Sort: community bills first (by popularity desc), then non-community bills
  votes.sort((a, b) => b.popularity - a.popularity);

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
      <MemberVoteList votes={votes} showAll />
    </div>
  );
}
