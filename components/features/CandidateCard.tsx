// components/features/CandidateCard.tsx
//
// Finance-forward card for a race detail page. One per candidate. Receipts
// + cash on hand are the headline numbers — clicking the card drills into
// the candidate detail page where top donors and PAC breakdown live.

import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
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
    <Link href={`/elections/candidate/${candidate.fecId}`} className="block">
      <GlassCard hover>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-brand text-lg text-cream truncate">
                {candidate.name}
              </h3>
              {isIncumbent && (
                <span className="text-[0.6rem] uppercase tracking-widest text-gold border border-gold/40 rounded px-1.5 py-0.5">
                  Incumbent
                </span>
              )}
            </div>
            {candidate.party && (
              <p className="text-cream/50 text-xs mt-0.5">{candidate.party}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Stat
            label="Raised"
            value={totals ? formatCurrency(totals.receipts) : "—"}
          />
          <Stat
            label="Cash on Hand"
            value={totals ? formatCurrency(totals.cashOnHand) : "—"}
          />
        </div>

        {!totals && (
          <p className="text-cream/35 text-[0.7rem] mt-3">
            No FEC filings yet for this cycle.
          </p>
        )}
      </GlassCard>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[0.6rem] uppercase tracking-widest text-cream/40">
        {label}
      </div>
      <div className="text-cream font-medium text-base mt-0.5 tabular-nums">
        {value}
      </div>
    </div>
  );
}
