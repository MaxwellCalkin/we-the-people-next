// app/(dashboard)/members/[bioguideId]/votes/page.tsx
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
import MemberVote from "@/models/MemberVote";
import Bill from "@/models/Bill";
import { fetchMemberDetail } from "@/lib/congress";
import { getUserVotes } from "@/lib/viewer";
import { displayName, formatBillNumber, memberTitle } from "@/lib/format";
import MemberVoteList from "@/components/features/MemberVoteList";
import PageHeader from "@/components/ui/PageHeader";

interface VotesPageProps {
  params: Promise<{ bioguideId: string }>;
}

export const metadata: Metadata = { title: "Voting record" };

export default async function MemberVotesPage({ params }: VotesPageProps) {
  const { bioguideId } = await params;

  await connectDB();

  const detail = await fetchMemberDetail(bioguideId);
  if (!detail) notFound();

  // Every cached vote for this member, not just bills the community voted on.
  const allMemberVotes = await MemberVote.find({ bioguideId }).sort({ fetchedAt: -1 }).lean();
  const memberBillSlugs = allMemberVotes.map((mv) => mv.billSlug);
  const allBills = await Bill.find({ billSlug: { $in: memberBillSlugs } })
    .select("billSlug title yeas nays")
    .lean();
  const billMap = new Map(allBills.map((b) => [b.billSlug, b]));

  const votes = allMemberVotes
    .filter((mv) => mv.vote === "Yea" || mv.vote === "Nay")
    .map((mv) => {
      const bill = billMap.get(mv.billSlug);
      const hasCommunityVotes = bill && (bill.yeas > 0 || bill.nays > 0);
      const communityPosition = hasCommunityVotes ? (bill.yeas >= bill.nays ? "Yea" : "Nay") : null;
      return {
        billSlug: mv.billSlug,
        congress: mv.congress,
        title: bill?.title || formatBillNumber(mv.billSlug),
        memberVote: mv.vote,
        communityPosition,
        matches: communityPosition ? mv.vote === communityPosition : null,
        popularity: hasCommunityVotes ? bill.yeas + bill.nays : 0,
      };
    });

  // Community bills first (most-voted first), then everything else.
  votes.sort((a, b) => b.popularity - a.popularity);

  const userVotes = await getUserVotes();
  const fullName = displayName(detail.name);
  const communityCount = votes.filter((v) => v.communityPosition).length;
  const matching = votes.filter((v) => v.matches).length;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        breadcrumbs={[
          { label: "Members", href: "/members" },
          { label: fullName, href: `/members/${bioguideId}` },
          { label: "Voting record" },
        ]}
        title={
          <>
            {memberTitle(detail.chamber)} {fullName}&apos;s voting record
          </>
        }
        description={
          votes.length === 0
            ? "We haven't recorded any votes for this member yet."
            : `${votes.length} recorded ${votes.length === 1 ? "vote" : "votes"}${
                communityCount > 0
                  ? ` · sided with the Heard community on ${matching} of ${communityCount} bills people voted on`
                  : ""
              }.`
        }
      />
      <MemberVoteList votes={votes} showAll userVotes={userVotes} emptyText="No recorded votes yet. Votes appear here once members vote on bills people are voting on." />
    </div>
  );
}
