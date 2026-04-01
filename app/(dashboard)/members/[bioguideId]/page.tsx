// app/(dashboard)/members/[bioguideId]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import MemberScore from "@/models/MemberScore";
import MemberVote from "@/models/MemberVote";
import Bill from "@/models/Bill";
import { fetchMemberDetail } from "@/lib/congress";
import { computePersonalAlignment } from "@/lib/member-votes";
import { getTrendingBills } from "@/lib/trending";
import MemberProfileHeader from "@/components/features/MemberProfileHeader";
import MemberStats from "@/components/features/MemberStats";
import MemberVoteList from "@/components/features/MemberVoteList";
import GlassCard from "@/components/ui/GlassCard";

interface MemberProfilePageProps {
  params: Promise<{ bioguideId: string }>;
}

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
  const { bioguideId } = await params;

  await connectDB();

  const detail = await fetchMemberDetail(bioguideId);
  if (!detail) notFound();

  const memberScore = await MemberScore.findOne({ bioguideId }).lean();

  const session = await auth();
  let personalAlignment = { score: null as number | null, matching: 0, total: 0 };
  if (session?.user?.id) {
    const user = await User.findById(session.user.id)
      .select("yeaBillSlugs nayBillSlugs")
      .lean();
    if (user) {
      personalAlignment = await computePersonalAlignment(
        bioguideId,
        user.yeaBillSlugs || [],
        user.nayBillSlugs || []
      );
    }
  }

  let tenureYears = 0;
  let tenureDetail = "";
  if (detail.terms.length > 0) {
    const firstTerm = detail.terms[0];
    tenureYears = new Date().getFullYear() - firstTerm.startYear;
    tenureDetail = `${firstTerm.chamber} since ${firstTerm.startYear}`;
  }

  const trendingBills = await getTrendingBills(10);
  const trendingSlugs = trendingBills.map((b) => b.billSlug);

  const memberVotesOnTrending = await MemberVote.find({
    bioguideId,
    billSlug: { $in: trendingSlugs },
  }).lean();

  const bills = await Bill.find({ billSlug: { $in: trendingSlugs } })
    .select("billSlug title yeas nays")
    .lean();
  const billMap = new Map(bills.map((b) => [b.billSlug, b]));

  const trendingVotes = memberVotesOnTrending
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <MemberProfileHeader
        name={detail.name}
        party={detail.party}
        state={detail.state}
        district={detail.district}
        chamber={detail.chamber}
        imageUrl={detail.imageUrl}
        website={detail.website}
        phone={detail.phone}
        leadership={detail.leadership}
      />

      <MemberStats
        communityScore={memberScore?.communityScore ?? null}
        communityDetail={
          memberScore && memberScore.totalCompared > 0
            ? `${memberScore.matchingVotes}/${memberScore.totalCompared} votes match`
            : "no overlap"
        }
        personalScore={personalAlignment.score}
        personalDetail={
          session
            ? personalAlignment.total > 0
              ? `${personalAlignment.matching}/${personalAlignment.total} of your votes`
              : "no overlap"
            : "Log in to see"
        }
        tenure={tenureYears > 0 ? `${tenureYears} yrs` : "< 1 yr"}
        tenureDetail={tenureDetail}
      />

      {detail.committees.length > 0 && (
        <div>
          <h2 className="text-[0.65rem] uppercase tracking-widest text-cream/40 mb-3">
            Committees
          </h2>
          <div className="flex flex-wrap gap-2">
            {detail.committees.map((c) => (
              <span
                key={c.name}
                className="bg-glass-bg border border-glass-border rounded-md px-3 py-1.5 text-cream/60 text-xs"
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {detail.sponsoredBills.filter((b) => b.title).length > 0 && (
        <div>
          <h2 className="text-[0.65rem] uppercase tracking-widest text-cream/40 mb-3">
            Recently Sponsored Bills
          </h2>
          <div className="space-y-2">
            {detail.sponsoredBills
              .filter((b) => b.title)
              .map((b) => (
              <Link key={`${b.billSlug}-${b.congress}`} href={`/vote/${b.billSlug}/${b.congress}`}>
                <GlassCard hover>
                  <p className="text-cream text-sm font-medium hover:text-gold transition-colors">
                    {b.billSlug.toUpperCase()} — {b.title}
                  </p>
                  {b.introducedDate && (
                    <p className="text-cream/35 text-xs mt-0.5">
                      Introduced {b.introducedDate}
                    </p>
                  )}
                </GlassCard>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-[0.65rem] uppercase tracking-widest text-cream/40 mb-1">
          Votes on Trending Bills
        </h2>
        <p className="text-cream/30 text-xs mb-3">
          How this member voted on bills the community is engaging with
        </p>
        <MemberVoteList
          votes={trendingVotes}
          bioguideId={bioguideId}
        />
      </div>
    </div>
  );
}
