import { ExternalLink } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import type { CandidateTotals, ContributorAggregate } from "@/lib/fec";

interface CampaignFinanceProps {
  cycle: number;
  totals: CandidateTotals | null;
  topIndividuals: ContributorAggregate[];
  topPacs: ContributorAggregate[];
  opensecretsId?: string;
  memberName: string;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CampaignFinance({
  cycle,
  totals,
  topIndividuals,
  topPacs,
  opensecretsId,
  memberName,
}: CampaignFinanceProps) {
  // Hide the whole section if we have nothing at all to show
  if (!totals && topIndividuals.length === 0 && topPacs.length === 0 && !opensecretsId) {
    return null;
  }

  const cycleLabel = `${cycle - 1}–${cycle}`;
  const opensecretsUrl = opensecretsId
    ? `https://www.opensecrets.org/members-of-congress/summary?cid=${opensecretsId}`
    : null;

  return (
    <GlassCard>
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="font-brand text-xl text-cream">Campaign Finance</h2>
        <span className="text-cream/40 text-xs">Cycle {cycleLabel}</span>
      </div>
      <p className="text-cream/50 text-xs mb-4">
        Source: FEC (public domain). Data reflects latest quarterly filings.
      </p>

      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Stat label="Receipts" value={formatCurrency(totals.receipts)} />
          <Stat label="Disbursements" value={formatCurrency(totals.disbursements)} />
          <Stat label="Cash on Hand" value={formatCurrency(totals.cashOnHand)} />
          <Stat label="From PACs" value={formatCurrency(totals.pacContributions)} />
        </div>
      )}

      {totals?.coverageEndDate && (
        <p className="text-cream/35 text-[0.65rem] mb-4">
          Through {new Date(totals.coverageEndDate).toLocaleDateString()}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <ContributorList
          title="Top Individual Contributions"
          rows={topIndividuals}
        />
        <ContributorList title="Top PAC Contributions" rows={topPacs} />
      </div>

      {opensecretsUrl && (
        <div className="mt-5 pt-4 border-t border-white/10">
          <a
            href={opensecretsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-gold text-sm hover:text-gold/80 transition-colors"
          >
            View {memberName}&apos;s industry breakdown on OpenSecrets
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </GlassCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[0.65rem] uppercase tracking-widest text-cream/40">
        {label}
      </div>
      <div className="text-cream font-medium text-sm mt-0.5">{value}</div>
    </div>
  );
}

function ContributorList({
  title,
  rows,
}: {
  title: string;
  rows: ContributorAggregate[];
}) {
  return (
    <div>
      <h3 className="text-[0.65rem] uppercase tracking-widest text-cream/40 mb-2">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-cream/40 text-xs">No data available.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r, i) => (
            <li
              key={`${r.contributor}-${i}`}
              className="flex items-baseline justify-between gap-3 text-xs"
            >
              <span className="text-cream/80 truncate">{r.contributor}</span>
              <span className="text-cream/60 tabular-nums shrink-0">
                {formatCurrency(r.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
