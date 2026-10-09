export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ExternalLink, FileQuestion, FileText, Lightbulb, ThumbsDown, ThumbsUp, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Bill from "@/models/Bill";
import User from "@/models/User";
import { fetchBillDetails, fetchMembers, getMemberVoteOnBill, parseBillSlug } from "@/lib/congress";
import { getUserVotes } from "@/lib/viewer";
import { districtKey } from "@/lib/usGeo";
import { formatBillNumber, formatDate } from "@/lib/format";
import { loginHref } from "@/lib/safe-redirect";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import BillHeader from "@/components/features/BillHeader";
import VoteStats from "@/components/features/VoteStats";
import RepVoteDisplay, { agreementSummary, type RepVote } from "@/components/features/RepVoteDisplay";

interface VotedPageProps {
  params: Promise<{ slug: string; congress: string }>;
}

export async function generateMetadata({ params }: VotedPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Results for ${formatBillNumber(slug)}` };
}

export default async function VotedPage({ params }: VotedPageProps) {
  const { slug, congress } = await params;
  const session = await auth();
  if (!session) redirect(loginHref(`/vote/${slug}/${congress}/voted`));

  await connectDB();
  const userState = session.user.state;
  const userCd = session.user.cd;
  const parsed = parseBillSlug(slug);
  const hasDistrict = Boolean(userState && userCd);

  // Independent I/O runs concurrently; rep-vote lookups key off the URL slug.
  const [bill, allStateMembers, houseReps, userVotes, billDoc, districtYeas, districtNays] = await Promise.all([
    fetchBillDetails(congress, slug).catch(() => null),
    fetchMembers(userState).catch(() => []),
    fetchMembers(userState, userCd).catch(() => []),
    getUserVotes(),
    Bill.findOne({ billSlug: slug }).select("yeas nays").lean(),
    hasDistrict ? User.countDocuments({ yeaBillSlugs: slug, state: userState, cd: userCd }) : Promise.resolve(0),
    hasDistrict ? User.countDocuments({ nayBillSlugs: slug, state: userState, cd: userCd }) : Promise.resolve(0),
  ]);

  if (!bill) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <EmptyState
          icon={FileQuestion}
          title="We couldn't load this bill"
          description="Congress.gov may be temporarily unavailable. Please try again in a few minutes."
          action={<ButtonLink href="/bills">Browse bills</ButtonLink>}
        />
      </div>
    );
  }

  const senators = allStateMembers.filter((m) => !m.district || m.district === 0).slice(0, 2);
  const voteTargets = parsed
    ? [
        ...senators.map((s) => ({ id: s.id, name: s.name, role: "Senator", chamber: "senate" as const })),
        ...(houseReps[0]
          ? [{ id: houseReps[0].id, name: houseReps[0].name, role: "Representative", chamber: "house" as const }]
          : []),
      ]
    : [];
  const votes = await Promise.all(
    voteTargets.map((t) =>
      getMemberVoteOnBill(t.id, congress, parsed!.type, parsed!.number, t.chamber).catch(() => "Has Not Voted On This Bill")
    )
  );
  const repVotes: RepVote[] = voteTargets.map((t, i) => ({ id: t.id, name: t.name, role: t.role, vote: votes[i] }));

  const userVote = userVotes[slug] ?? null;
  const district = hasDistrict ? districtKey(userState, userCd) : undefined;
  const returnTo = `/vote/${slug}/${congress}`;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <BillHeader bill={bill} showMeta={false} />

      {userVote ? (
        <Card className={`mb-6 flex items-center gap-4 ${userVote === "Yea" ? "border-yea/30" : "border-nay/30"}`}>
          <span
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              userVote === "Yea" ? "bg-yea/12 text-yea" : "bg-nay/12 text-nay"
            }`}
          >
            {userVote === "Yea" ? <ThumbsUp className="h-6 w-6" aria-hidden="true" /> : <ThumbsDown className="h-6 w-6" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-ink">
              You voted <span className={userVote === "Yea" ? "text-yea" : "text-nay"}>{userVote}</span>
            </p>
            <p className="text-sm text-ink-2">Here&apos;s how the community and your representatives line up.</p>
          </div>
        </Card>
      ) : (
        <Card className="mb-6 flex flex-col gap-4 border-gold/30 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-ink">You haven&apos;t voted on this bill yet</p>
            <p className="text-sm text-ink-2">Cast your vote to see how your representatives compare.</p>
          </div>
          <ButtonLink href={returnTo} iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
            Vote now
          </ButtonLink>
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card as="section" aria-labelledby="community-heading">
          <h2 id="community-heading" className="text-lg font-semibold text-ink">
            How Heard voted
          </h2>
          <p className="mt-1 mb-6 text-sm text-ink-3">Community votes are unofficial and don&apos;t affect Congress.</p>
          <VoteStats
            yeas={billDoc?.yeas ?? 0}
            nays={billDoc?.nays ?? 0}
            districtYeas={districtYeas}
            districtNays={districtNays}
            districtLabel={district}
          />
        </Card>

        <Card as="section" aria-labelledby="reps-heading">
          <h2 id="reps-heading" className="text-lg font-semibold text-ink">
            Your representatives
          </h2>
          <p className="mt-1 mb-5 text-sm text-ink-3">{agreementSummary(repVotes, userVote)}</p>
          <RepVoteDisplay reps={repVotes} userVote={userVote} />
          <div className="mt-5 border-t border-line pt-4">
            <Link
              href={`/vote/${slug}/${congress}/votes`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-bright hover:text-gold"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              See how every member voted
            </Link>
          </div>
        </Card>
      </div>

      {bill.cboCostEstimates && bill.cboCostEstimates.length > 0 && (
        <Card as="section" aria-labelledby="cbo-heading" className="mt-6">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-bright ring-1 ring-gold/25">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="eyebrow">Congressional Budget Office</p>
              <h2 id="cbo-heading" className="mt-1 text-lg font-semibold text-ink">
                {bill.cboCostEstimates.length === 1 ? "Cost estimate" : `${bill.cboCostEstimates.length} cost estimates`}
              </h2>
              <p className="mt-1 text-sm text-ink-3">
                Nonpartisan analyses of what this bill would cost. The figures live in the full report.
              </p>
            </div>
          </div>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {bill.cboCostEstimates.map((est, i) => (
              <li key={i}>
                <a
                  href={est.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full flex-col rounded-xl border border-line bg-surface-2/50 p-4 transition-colors hover:border-gold/40"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-ink group-hover:text-gold-bright">
                      {est.title || "CBO cost estimate"}
                    </span>
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-ink-3 group-hover:text-gold-bright" aria-hidden="true" />
                  </span>
                  {est.description && <span className="mt-1.5 text-xs leading-relaxed text-ink-3 line-clamp-3">{est.description}</span>}
                  {est.pubDate && <span className="mt-auto pt-3 text-xs text-ink-3">Published {formatDate(est.pubDate)}</span>}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-bright ring-1 ring-gold/25">
          <Lightbulb className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-ink">Think there&apos;s a better approach?</p>
          <p className="text-sm text-ink-2">Propose your own bill and rally support from people in your district.</p>
        </div>
        <ButtonLink href="/proposals/new" variant="secondary">
          Propose a bill
        </ButtonLink>
      </Card>
    </div>
  );
}
