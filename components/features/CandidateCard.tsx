// components/features/CandidateCard.tsx
//
// Finance-forward card for a race detail page. One per candidate. Receipts
// + cash on hand are the headline numbers — clicking the card drills into
// the candidate detail page where top donors and PAC breakdown live.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Badge from "@/components/ui/Badge";
import PartyBadge from "@/components/ui/PartyBadge";
import { formatPersonName } from "@/lib/format";
import type { CandidateTotals } from "@/lib/fec";
import type { IRosterCandidate } from "@/models/ElectionRosterCache";

interface CandidateCardProps {
  candidate: IRosterCandidate;
  totals: CandidateTotals | null;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CandidateCard({ candidate, totals }: CandidateCardProps) {
  const isIncumbent = candidate.incumbentChallenge === "I";

  return (
    <article className="card card-interactive group flex h-full flex-col p-5">
      <div className="flex flex-wrap items-center gap-2">
        {candidate.party ? <PartyBadge party={candidate.party} /> : <Badge>Party not listed</Badge>}
        {isIncumbent && <Badge tone="gold">Incumbent</Badge>}
      </div>
      <h3 className="mt-3 text-lg font-semibold text-ink">
        <Link href={`/elections/candidate/${candidate.fecId}`} className="stretched-link">
          {formatPersonName(candidate.name)}
        </Link>
      </h3>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-xs font-medium text-ink-3">Raised</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-ink">{totals ? formatCurrency(totals.receipts) : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-ink-3">Cash on hand</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-ink">{totals ? formatCurrency(totals.cashOnHand) : "—"}</dd>
        </div>
      </dl>
      {!totals && <p className="mt-3 text-sm text-ink-3">No finance totals filed for this cycle.</p>}

      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-gold-bright">
        Explore campaign finance
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </article>
  );
}
