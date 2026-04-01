// app/(dashboard)/members/[bioguideId]/votes/page.tsx
import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
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

  const communityBills = await Bill.find({
    $or: [{ yeas: { $gt: 0 } }, { nays: { $gt: 0 } }],
  })
    .select("billSlug title yeas nays")
    .lean();

  const communityBillSlugs = communityBills.map((b) => b.billSlug);
  const billMap = new Map(communityBills.map((b) => [b.billSlug, b]));

  const memberVotes = await MemberVote.find({
    bioguideId,
    billSlug: { $in: communityBillSlugs },
  }).lean();

  const votes = memberVotes
    .filter((mv) => mv.vote === "Yea" || mv.vote === "Nay")
    .map((mv) => {
      const bill = billMap.get(mv.billSlug);
      const communityPosition = bill
        ? bill.yeas >= bill.nays ? "Yea" : "Nay"
        : "N/A";
      return {
        billSlug: mv.billSlug,
        congress: mv.congress,
        title: bill?.title || mv.billSlug,
        memberVote: mv.vote,
        communityPosition,
        matches: mv.vote === communityPosition,
      };
    });

  const prefix = detail.chamber === "Senate" ? "Sen." : "Rep.";

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
        {votes.length} vote{votes.length !== 1 ? "s" : ""} on community bills
      </p>
      <MemberVoteList votes={votes} showAll />
    </div>
  );
}
