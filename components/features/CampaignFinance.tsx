import { ExternalLink } from "lucide-react";
import Card from "@/components/ui/Card";
import type { CandidateTotals, ContributorAggregate, OutsideSpending } from "@/lib/fec";

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
  const hasOutside = !!outsideSpending && (outsideSpending.supportTotal > 0 || outsideSpending.opposeTotal > 0);

  // Hide the whole section if we have nothing at all to show
  if (!totals && topIndividuals.length === 0 && topPacs.length === 0 && !hasOutside && !opensecretsId) {
    return null;
  }

  const cycleLabel = `${cycle - 1}–${cycle}`;
  const opensecretsUrl = opensecretsId
    ? `https://www.opensecrets.org/members-of-congress/summary?cid=${opensecretsId}`
    : null;

  return (
    <Card as="section" aria-labelledby="finance-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="finance-heading" className="text-lg font-semibold text-ink">
          Campaign finance
        </h2>
        <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs text-ink-2">{cycleLabel} cycle</span>
      </div>
      <p className="mt-1 text-sm text-ink-3">
        Source: Federal Election Commission. Reflects the latest quarterly filings
        {totals?.coverageEndDate ? `, through ${new Date(totals.coverageEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}.
      </p>

      {totals && (
        <>
          <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Total raised" value={formatCurrency(totals.receipts)} />
            <Stat label="Total spent" value={formatCurrency(totals.disbursements)} />
            <Stat label="Cash on hand" value={formatCurrency(totals.cashOnHand)} />
          </dl>
          <SourceBreakdown totals={totals} />
        </>
      )}

      {hasOutside && outsideSpending && <OutsideSpendingPanel spending={outsideSpending} memberName={memberName} />}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <ContributorList
          title="Largest individual gifts"
          subtitle="The federal cap is $3,300 per donor per election. Most campaign money comes from many smaller donations not shown here."
          rows={topIndividuals}
        />
        <ContributorList
          title="Largest PAC contributions"
          subtitle="Single PAC gifts ranked by size. See “From PACs” above for the cycle total."
          rows={topPacs}
        />
      </div>

      {opensecretsUrl && (
        <div className="mt-6 border-t border-line pt-4">
          <a
            href={opensecretsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-bright hover:text-gold"
          >
            See {memberName}&apos;s industry breakdown on OpenSecrets
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/50 px-4 py-3">
      <dt className="text-xs font-medium text-ink-3">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  );
}

function ContributorList({ title, subtitle, rows }: { title: string; subtitle?: string; rows: ContributorAggregate[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {subtitle && <p className="mt-1 mb-3 text-xs leading-relaxed text-ink-3">{subtitle}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-ink-3">No data available.</p>
      ) : (
        <ul className="divide-y divide-line/70">
          {rows.map((r, i) => (
            <li key={`${r.contributor}-${i}`} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <span className="truncate text-ink-2">{r.contributor}</span>
              <span className="shrink-0 font-medium tabular-nums text-ink">{formatCurrency(r.amount)}</span>
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
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-ink">Where the money came from</h3>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
        <div className="bg-gold" style={{ width: `${indPct}%` }} />
        <div className="bg-info" style={{ width: `${pacPct}%` }} />
        <div className="bg-ink-3/60" style={{ width: `${otherPct}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <SourceLeg color="bg-gold" label="Individuals" value={fromIndividuals} pct={indPct} />
        <SourceLeg color="bg-info" label="PACs" value={fromPacs} pct={pacPct} />
        <SourceLeg color="bg-ink-3/60" label="Other" value={other} pct={otherPct} />
      </div>
    </div>
  );
}

function SourceLeg({ color, label, value, pct }: { color: string; label: string; value: number; pct: number }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-ink-3">
        <span className={`inline-block h-2 w-2 rounded-sm ${color}`} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium tabular-nums text-ink">{formatCurrency(value)}</div>
      <div className="text-xs tabular-nums text-ink-3">{pct.toFixed(0)}%</div>
    </div>
  );
}

function OutsideSpendingPanel({ spending, memberName }: { spending: OutsideSpending; memberName: string }) {
  const { supportTotal, opposeTotal, topSupporters, topOpposers } = spending;
  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface-2/40 p-4 sm:p-5">
      <h3 className="font-semibold text-ink">Outside spending (super PACs and other groups)</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-3">
        Independent expenditures reported under FEC Schedule E. This money never touches {memberName}&apos;s campaign —
        super PACs and 501(c)(4)s spend it directly, and it is <em>not</em>{" "}included in &ldquo;Total raised&rdquo; above. It
        often dwarfs a candidate&apos;s own fundraising. Totals below are computed from the 200 largest single expenditures
        reported this cycle.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-yea/25 bg-yea/[0.06] px-4 py-3">
          <div className="text-xs font-medium text-yea">Spent supporting</div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-ink">{formatCurrency(supportTotal)}</div>
        </div>
        <div className="rounded-xl border border-nay/25 bg-nay/[0.06] px-4 py-3">
          <div className="text-xs font-medium text-nay">Spent opposing</div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-ink">{formatCurrency(opposeTotal)}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <OutsideList title="Top groups supporting" rows={topSupporters} tone="support" />
        <OutsideList title="Top groups opposing" rows={topOpposers} tone="oppose" />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-3">
        Committees with many small expenditures past the top 200 may be slightly under-counted; the top spenders in any
        contested race are almost always captured.
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
  return (
    <div>
      <h4 className={`text-xs font-semibold ${tone === "support" ? "text-yea" : "text-nay"}`}>{title}</h4>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ink-3">No data available.</p>
      ) : (
        <ul className="mt-1 divide-y divide-line/70">
          {rows.map((r, i) => (
            <li key={`${r.name}-${i}`} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <span className="truncate text-ink-2">{r.name}</span>
              <span className="shrink-0 font-medium tabular-nums text-ink">{formatCurrency(r.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
