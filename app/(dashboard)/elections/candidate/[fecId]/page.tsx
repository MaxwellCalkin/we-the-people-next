// app/(dashboard)/elections/candidate/[fecId]/page.tsx
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ListChecks } from "lucide-react";
import connectDB from "@/lib/db";
import { currentCycle, getCandidateDetail } from "@/lib/fec";
import { loadCandidateFinance, mongoCandidateFinanceStore, liveCandidateFinanceFetcher } from "@/lib/election-cache";
import { findIncumbentByFecId } from "@/lib/crosswalk";
import { stateName } from "@/lib/states";
import { formatPersonName } from "@/lib/format";
import CampaignFinance from "@/components/features/CampaignFinance";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import PartyBadge from "@/components/ui/PartyBadge";

interface CandidatePageProps {
  params: Promise<{ fecId: string }>;
}

export const metadata: Metadata = { title: "Candidate finance" };

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { fecId } = await params;

  await connectDB();
  const cycle = currentCycle();

  const [bio, incumbentLink, finance] = await Promise.all([
    getCandidateDetail(fecId).catch((e) => {
      console.error("Candidate detail failed for", fecId, e);
      return null;
    }),
    findIncumbentByFecId(fecId).catch(() => null),
    loadCandidateFinance(fecId, cycle, mongoCandidateFinanceStore, liveCandidateFinanceFetcher).catch((e) => {
      console.error("Finance lookup failed for candidate", fecId, e);
      return { totals: null, topIndividuals: [], topPacs: [], outsideSpending: null };
    }),
  ]);

  if (!bio) notFound();

  const name = formatPersonName(bio.name);
  const officeLabel =
    bio.office === "H"
      ? `U.S. House · ${bio.state}${bio.district ? `-${bio.district}` : ""}`
      : bio.office === "S"
        ? `U.S. Senate · ${stateName(bio.state)}`
        : "President";

  const isIncumbent = bio.incumbentChallenge === "I";
  const backHref =
    bio.office === "H" && bio.district
      ? `/elections/${bio.state}/house/${bio.district}`
      : bio.office === "S"
        ? `/elections/${bio.state}/senate`
        : bio.state
          ? `/elections/${bio.state}`
          : "/elections";

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
      <PageHeader
        breadcrumbs={[
          { label: "Elections", href: "/elections" },
          { label: officeLabel, href: backHref },
          { label: name },
        ]}
        eyebrow={officeLabel}
        title={name}
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {bio.party && <PartyBadge party={bio.party} />}
          {isIncumbent && <Badge tone="gold">Incumbent</Badge>}
        </div>
      </PageHeader>

      {incumbentLink && (
        <div className="card card-interactive group flex items-center gap-4 p-5">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-bright ring-1 ring-gold/25">
            <ListChecks className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-ink-3">Sitting member of Congress</p>
            <Link href={`/members/${incumbentLink.bioguideId}`} className="stretched-link font-semibold text-ink">
              See {name}&apos;s voting record on Heard
            </Link>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
      )}

      <CampaignFinance
        cycle={cycle}
        totals={finance.totals}
        topIndividuals={finance.topIndividuals}
        topPacs={finance.topPacs}
        outsideSpending={finance.outsideSpending}
        memberName={name}
      />

      {!finance.totals && (
        <p className="text-sm text-ink-3">
          No FEC filings yet for this cycle. Candidates start reporting once they raise or spend more than $5,000.
        </p>
      )}
    </div>
  );
}
