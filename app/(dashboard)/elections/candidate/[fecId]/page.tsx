// app/(dashboard)/elections/candidate/[fecId]/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import connectDB from "@/lib/db";
import { currentCycle, getCandidateDetail } from "@/lib/fec";
import {
  loadCandidateFinance,
  mongoCandidateFinanceStore,
  liveCandidateFinanceFetcher,
} from "@/lib/election-cache";
import { findIncumbentByFecId } from "@/lib/crosswalk";
import { stateName } from "@/lib/states";
import GlassCard from "@/components/ui/GlassCard";
import CampaignFinance from "@/components/features/CampaignFinance";

interface CandidatePageProps {
  params: Promise<{ fecId: string }>;
}

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
    loadCandidateFinance(
      fecId,
      cycle,
      mongoCandidateFinanceStore,
      liveCandidateFinanceFetcher
    ).catch((e) => {
      console.error("Finance lookup failed for candidate", fecId, e);
      return {
        totals: null,
        topIndividuals: [],
        topPacs: [],
        outsideSpending: null,
      };
    }),
  ]);

  if (!bio) notFound();

  const officeLabel =
    bio.office === "H"
      ? `U.S. House — ${bio.state}${bio.district ? `-${bio.district}` : ""}`
      : bio.office === "S"
        ? `U.S. Senate — ${stateName(bio.state)}`
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <header>
        <p className="text-cream/40 text-xs uppercase tracking-widest mb-1">
          <Link href="/elections" className="hover:text-cream">
            Elections
          </Link>
          <span className="mx-1.5">/</span>
          <Link href={backHref} className="hover:text-cream">
            {officeLabel}
          </Link>
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-brand text-3xl sm:text-4xl text-gradient">
            {bio.name}
          </h1>
          {isIncumbent && (
            <span className="text-[0.65rem] uppercase tracking-widest text-gold border border-gold/40 rounded px-2 py-0.5">
              Incumbent
            </span>
          )}
        </div>
        {bio.party && (
          <p className="text-cream/60 text-sm mt-1">
            {bio.party} · {officeLabel}
          </p>
        )}
      </header>

      {incumbentLink && (
        <Link
          href={`/members/${incumbentLink.bioguideId}`}
          className="block"
        >
          <GlassCard hover>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.65rem] uppercase tracking-widest text-gold/80">
                  Sitting Member
                </p>
                <p className="text-cream text-sm mt-0.5">
                  View {bio.name}&apos;s voting record on Heard
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-cream/40 shrink-0" />
            </div>
          </GlassCard>
        </Link>
      )}

      <CampaignFinance
        cycle={cycle}
        totals={finance.totals}
        topIndividuals={finance.topIndividuals}
        topPacs={finance.topPacs}
        outsideSpending={finance.outsideSpending}
        memberName={bio.name}
      />

      {!finance.totals && (
        <p className="text-cream/40 text-xs">
          No FEC filings yet for this cycle — candidates start reporting once
          they raise or spend more than $5,000.
        </p>
      )}
    </div>
  );
}
