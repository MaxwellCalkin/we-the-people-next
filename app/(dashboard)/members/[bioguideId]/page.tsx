// app/(dashboard)/members/[bioguideId]/page.tsx
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import MemberScore from "@/models/MemberScore";
import MemberVote from "@/models/MemberVote";
import Bill from "@/models/Bill";
import LegislatorCrosswalk from "@/models/LegislatorCrosswalk";
import { fetchMemberDetail } from "@/lib/congress";
import { computePersonalAlignment } from "@/lib/member-votes";
import { getTrendingBills } from "@/lib/trending";
import { getUserVotes } from "@/lib/viewer";
import { displayName, formatBillNumber, formatDate } from "@/lib/format";
import { billHref } from "@/lib/routes";
import { loginHref } from "@/lib/safe-redirect";
import {
  currentCycle,
  type CandidateTotals,
  type ContributorAggregate,
  type OutsideSpending,
} from "@/lib/fec";
import { loadCachedFinance, mongoFinanceStore, liveFecFetcher } from "@/lib/fec-cache";
import MemberProfileHeader from "@/components/features/MemberProfileHeader";
import MemberStats from "@/components/features/MemberStats";
import MemberVoteList from "@/components/features/MemberVoteList";
import CampaignFinance from "@/components/features/CampaignFinance";
import { SectionHeading } from "@/components/ui/PageHeader";

interface MemberProfilePageProps {
  params: Promise<{ bioguideId: string }>;
}

export async function generateMetadata({ params }: MemberProfilePageProps): Promise<Metadata> {
  const { bioguideId } = await params;
  await connectDB();
  const score = await MemberScore.findOne({ bioguideId }).select("name").lean().catch(() => null);
  return { title: score?.name ? displayName(score.name) : "Member of Congress" };
}

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
  const { bioguideId } = await params;

  await connectDB();

  const detail = await fetchMemberDetail(bioguideId);
  if (!detail) notFound();

  const [memberScore, session, userVotes] = await Promise.all([
    MemberScore.findOne({ bioguideId }).lean(),
    auth(),
    getUserVotes(),
  ]);

  let personalAlignment = { score: null as number | null, matching: 0, total: 0 };
  if (session?.user?.id) {
    const user = await User.findById(session.user.id).select("yeaBillSlugs nayBillSlugs").lean();
    if (user) {
      personalAlignment = await computePersonalAlignment(bioguideId, user.yeaBillSlugs || [], user.nayBillSlugs || []);
    }
  }

  let tenureYears = 0;
  let tenureDetail = "";
  if (detail.terms.length > 0) {
    const currentTerm = detail.terms[detail.terms.length - 1];
    const firstTermInChamber = detail.terms.find((t) => t.chamber === currentTerm.chamber) || currentTerm;
    tenureYears = new Date().getFullYear() - firstTermInChamber.startYear;
    tenureDetail = `In the ${currentTerm.chamber} since ${firstTermInChamber.startYear}`;
  }

  // Campaign finance: bioguide → FEC candidate ID via crosswalk → OpenFEC.
  // Each lookup is wrapped in try/catch so a flaky external API never breaks
  // the member page.
  const cycle = currentCycle();
  let financeTotals: CandidateTotals | null = null;
  let financeIndividuals: ContributorAggregate[] = [];
  let financePacs: ContributorAggregate[] = [];
  let financeOutside: OutsideSpending | null = null;
  let opensecretsId: string | undefined;
  const crosswalk = await LegislatorCrosswalk.findOne({ bioguideId }).lean();
  if (crosswalk) {
    opensecretsId = crosswalk.opensecretsId;
    const fecId = (crosswalk.fecIds || [])[0];
    if (fecId && process.env.FEC_API_KEY) {
      try {
        const finance = await loadCachedFinance(bioguideId, fecId, cycle, mongoFinanceStore, liveFecFetcher);
        financeTotals = finance.totals;
        financeIndividuals = finance.topIndividuals;
        financePacs = finance.topPacs;
        financeOutside = finance.outsideSpending;
      } catch (e) {
        console.error("FEC lookup failed for", bioguideId, e instanceof Error ? e.message : e);
      }
    }
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
      const communityPosition = bill ? (bill.yeas >= bill.nays ? "Yea" : "Nay") : null;
      return {
        billSlug: mv.billSlug,
        congress: mv.congress,
        title: bill?.title || formatBillNumber(mv.billSlug),
        memberVote: mv.vote,
        communityPosition,
        matches: communityPosition ? mv.vote === communityPosition : null,
      };
    });

  const sponsored = detail.sponsoredBills.filter((b) => b.title);
  const fullName = displayName(detail.name);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6 lg:px-8">
      <MemberProfileHeader
        bioguideId={bioguideId}
        name={detail.name}
        party={detail.party || memberScore?.party || ""}
        state={detail.state}
        district={detail.district}
        chamber={detail.chamber}
        imageUrl={detail.imageUrl}
        website={detail.website}
        phone={detail.phone}
        leadership={detail.leadership}
      />

      <div>
        <MemberStats
          communityScore={memberScore?.communityScore ?? null}
          communityDetail={
            memberScore && memberScore.totalCompared > 0
              ? `Matches the community on ${memberScore.matchingVotes} of ${memberScore.totalCompared} votes`
              : "No votes shared with the community yet"
          }
          personalScore={personalAlignment.score}
          personalDetail={
            session
              ? personalAlignment.total > 0
                ? `Agrees with you on ${personalAlignment.matching} of ${personalAlignment.total} votes`
                : "Vote on bills this member voted on to compare"
              : "Log in to compare with your votes"
          }
          tenure={tenureYears > 0 ? `${tenureYears} ${tenureYears === 1 ? "year" : "years"}` : "< 1 year"}
          tenureDetail={tenureDetail}
        />
        {!session && (
          <p className="mt-3 text-sm text-ink-3">
            <Link
              href={loginHref(`/members/${bioguideId}`)}
              className="font-medium text-gold-bright underline-offset-2 hover:underline"
            >
              Log in
            </Link>{" "}
            to see how often {fullName} votes the way you do.
          </p>
        )}
      </div>

      <section aria-labelledby="trending-votes-heading">
        <SectionHeading
          id="trending-votes-heading"
          title="Votes on trending bills"
          description="How this member voted on the bills the community is engaging with most."
        />
        <MemberVoteList
          votes={trendingVotes}
          bioguideId={bioguideId}
          userVotes={userVotes}
          emptyText="This member hasn't voted on any of this week's trending bills."
        />
      </section>

      {sponsored.length > 0 && (
        <section aria-labelledby="sponsored-heading">
          <SectionHeading id="sponsored-heading" title="Recently sponsored bills" />
          <ul className="card divide-y divide-line overflow-hidden">
            {sponsored.map((b) => (
              <li key={`${b.billSlug}-${b.congress}`} className="relative px-4 py-3.5 transition-colors hover:bg-white/[0.025]">
                <p className="text-xs font-semibold text-gold-bright">{formatBillNumber(b.billSlug)}</p>
                <Link
                  href={billHref(b.billSlug, b.congress, Boolean(userVotes[b.billSlug]))}
                  className="stretched-link mt-0.5 block font-medium text-ink line-clamp-2"
                >
                  {b.title}
                </Link>
                {b.introducedDate && <p className="mt-1 text-xs text-ink-3">Introduced {formatDate(b.introducedDate)}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {detail.committees.length > 0 && (
        <section aria-labelledby="committees-heading">
          <SectionHeading id="committees-heading" title="Committees" />
          <ul className="flex flex-wrap gap-2">
            {detail.committees.map((c) => (
              <li key={c.name} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink-2">
                {c.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <CampaignFinance
        cycle={cycle}
        totals={financeTotals}
        topIndividuals={financeIndividuals}
        topPacs={financePacs}
        outsideSpending={financeOutside}
        opensecretsId={opensecretsId}
        memberName={fullName}
      />
    </div>
  );
}
