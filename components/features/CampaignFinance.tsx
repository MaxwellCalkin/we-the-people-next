import { ExternalLink } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import type {
  CandidateTotals,
  ContributorAggregate,
  OutsideSpending,
} from "@/lib/fec";

interface CampaignFinanceProps {
  cycle: number;
  totals: CandidateTotals | null;
  topIndividuals: ContributorAggregate[];
  topPacs: ContributorAggregate[];
  outsideSpending?: OutsideSpending | null;
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
  outsideSpending,
  opensecretsId,
  memberName,
}: CampaignFinanceProps) {
  const hasOutside =
    !!outsideSpending &&
    (outsideSpending.supportTotal > 0 || outsideSpending.opposeTotal > 0);

  // Hide the whole section if we have nothing at all to show
  if (
    !totals &&
    topIndividuals.length === 0 &&
    topPacs.length === 0 &&
    !hasOutside &&
    !opensecretsId
  ) {
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
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <Stat label="Total Raised" value={formatCurrency(totals.receipts)} />
            <Stat
              label="Total Spent"
              value={formatCurrency(totals.disbursements)}
            />
            <Stat
              label="Cash on Hand"
              value={formatCurrency(totals.cashOnHand)}
            />
          </div>

          <SourceBreakdown totals={totals} />
        </>
      )}

      {totals?.coverageEndDate && (
        <p className="text-cream/35 text-[0.65rem] mb-4">
          Through {new Date(totals.coverageEndDate).toLocaleDateString()}
        </p>
      )}

      {hasOutside && outsideSpending && (
        <OutsideSpendingPanel
          spending={outsideSpending}
          memberName={memberName}
        />
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <ContributorList
          title="Largest single individual gifts"
          subtitle="Federal cap is $3,300/cycle per donor — most campaign money comes from many smaller donations not shown here."
          rows={topIndividuals}
        />
        <ContributorList
          title="Largest single PAC contributions"
          subtitle="One-time PAC gifts ranked by size. See &ldquo;From PACs&rdquo; above for the cycle total."
          rows={topPacs}
        />
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
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: ContributorAggregate[];
}) {
  return (
    <div>
      <h3 className="text-[0.65rem] uppercase tracking-widest text-cream/40 mb-1">
        {title}
      </h3>
      {subtitle && (
        <p className="text-cream/30 text-[0.65rem] mb-2 leading-relaxed">
          {subtitle}
        </p>
      )}
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

function SourceBreakdown({ totals }: { totals: CandidateTotals }) {
  const fromIndividuals = totals.individualContributions;
  const fromPacs = totals.pacContributions;
  // "Other" sweeps in self-funding, party transfers, candidate-loan repayments,
  // and any other receipt category — receipts is the ground truth so any gap
  // between (individuals + PACs) and receipts goes here.
  const other = Math.max(0, totals.receipts - fromIndividuals - fromPacs);
  const total = fromIndividuals + fromPacs + other;
  if (total <= 0) return null;

  const indPct = (fromIndividuals / total) * 100;
  const pacPct = (fromPacs / total) * 100;
  const otherPct = 100 - indPct - pacPct;

  return (
    <div className="mb-5">
      <h3 className="text-[0.65rem] uppercase tracking-widest text-cream/40 mb-2">
        Where the Money Came From
      </h3>
      <div className="flex h-2 rounded overflow-hidden bg-glass-bg mb-2">
        <div
          className="bg-gold/70"
          style={{ width: `${indPct}%` }}
          title={`Individuals: ${formatCurrency(fromIndividuals)}`}
        />
        <div
          className="bg-red-accent/70"
          style={{ width: `${pacPct}%` }}
          title={`PACs: ${formatCurrency(fromPacs)}`}
        />
        <div
          className="bg-cream/30"
          style={{ width: `${otherPct}%` }}
          title={`Other (self-funding, party, etc.): ${formatCurrency(other)}`}
        />
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs">
        <SourceLeg
          color="bg-gold/70"
          label="Individuals"
          value={fromIndividuals}
          pct={indPct}
        />
        <SourceLeg
          color="bg-red-accent/70"
          label="PACs"
          value={fromPacs}
          pct={pacPct}
        />
        <SourceLeg
          color="bg-cream/30"
          label="Other"
          value={other}
          pct={otherPct}
        />
      </div>
    </div>
  );
}

function SourceLeg({
  color,
  label,
  value,
  pct,
}: {
  color: string;
  label: string;
  value: number;
  pct: number;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className={`inline-block w-2 h-2 rounded-sm ${color}`} />
        <span className="text-cream/60 text-[0.7rem]">{label}</span>
      </div>
      <div className="text-cream tabular-nums mt-0.5">
        {formatCurrency(value)}
      </div>
      <div className="text-cream/40 text-[0.65rem] tabular-nums">
        {pct.toFixed(0)}%
      </div>
    </div>
  );
}

function OutsideSpendingPanel({
  spending,
  memberName,
}: {
  spending: OutsideSpending;
  memberName: string;
}) {
  const { supportTotal, opposeTotal, topSupporters, topOpposers } = spending;
  return (
    <div className="mb-5 rounded-lg border border-glass-border bg-glass-bg p-4">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-brand text-base text-cream">
          Outside Spending (Super PACs & Other Groups)
        </h3>
      </div>
      <p className="text-cream/40 text-[0.7rem] mb-4 leading-relaxed">
        Independent expenditures reported under FEC Schedule E. This money
        never touches {memberName}&apos;s campaign — Super PACs and 501(c)(4)s
        spend it directly, and it does <em>not</em> appear in &ldquo;Total
        Raised&rdquo; above. It often dwarfs a candidate&apos;s own fundraising.
        Totals and groups below are computed from the 200 largest single
        reported expenditures in this cycle.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-md border border-gold/30 bg-gold/5 px-3 py-2">
          <div className="text-[0.6rem] uppercase tracking-widest text-gold/80">
            Spent Supporting
          </div>
          <div className="text-cream font-medium text-base mt-0.5 tabular-nums">
            {formatCurrency(supportTotal)}
          </div>
        </div>
        <div className="rounded-md border border-red-accent/30 bg-red-accent/5 px-3 py-2">
          <div className="text-[0.6rem] uppercase tracking-widest text-red-accent/90">
            Spent Opposing
          </div>
          <div className="text-cream font-medium text-base mt-0.5 tabular-nums">
            {formatCurrency(opposeTotal)}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <OutsideList
          title="Top groups supporting"
          rows={topSupporters}
          tone="support"
        />
        <OutsideList
          title="Top groups opposing"
          rows={topOpposers}
          tone="oppose"
        />
      </div>

      <p className="text-cream/30 text-[0.6rem] mt-3 leading-relaxed">
        Committees with many small expenditures past the top 200 may be
        slightly under-counted; the top spenders in any contested race are
        almost always captured.
      </p>
    </div>
  );
}

function OutsideList({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: { name: string; amount: number }[];
  tone: "support" | "oppose";
}) {
  const labelColor =
    tone === "support" ? "text-gold/80" : "text-red-accent/90";
  return (
    <div>
      <h4
        className={`text-[0.6rem] uppercase tracking-widest mb-2 ${labelColor}`}
      >
        {title}
      </h4>
      {rows.length === 0 ? (
        <p className="text-cream/40 text-xs">No data available.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r, i) => (
            <li
              key={`${r.name}-${i}`}
              className="flex items-baseline justify-between gap-3 text-xs"
            >
              <span className="text-cream/80 truncate">{r.name}</span>
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
