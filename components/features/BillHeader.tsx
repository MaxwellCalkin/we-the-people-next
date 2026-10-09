import { ExternalLink } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { Breadcrumbs, type Crumb } from "@/components/ui/PageHeader";
import { billChamber, congressGovUrl, formatBillNumber, formatDate, ordinal } from "@/lib/format";
import type { BillResult } from "@/types";

export function govtrackUrl(congress: string, slug: string) {
  return `https://www.govtrack.us/congress/bills/${congress}/${slug}`;
}

export default function BillHeader({
  bill,
  breadcrumbs,
  showMeta = true,
}: {
  bill: BillResult;
  breadcrumbs?: Crumb[];
  showMeta?: boolean;
}) {
  const chamber = billChamber(bill.bill_type);
  const officialUrl = congressGovUrl(bill.congress, bill.bill_slug);
  const introduced = formatDate(bill.introduced_date);
  const actionDate = formatDate(bill.latest_major_action_date);

  return (
    <header className="mb-8">
      <Breadcrumbs
        className="mb-5"
        items={breadcrumbs ?? [{ label: "Bills", href: "/bills" }, { label: formatBillNumber(bill.bill_slug) }]}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="gold" size="md">
          {formatBillNumber(bill.bill_slug)}
        </Badge>
        {chamber && <Badge size="md">{chamber}</Badge>}
        {Number(bill.congress) > 0 && (
          <span className="text-sm text-ink-3">{ordinal(Number(bill.congress))} Congress</span>
        )}
      </div>
      <h1 className="mt-4 max-w-4xl text-2xl font-semibold leading-tight text-ink sm:text-[2rem] text-balance">
        {bill.short_title || bill.title}
      </h1>

      {showMeta && (
        <dl className="mt-5 grid max-w-4xl gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {bill.sponsor && (
            <div>
              <dt className="text-ink-3">Sponsor</dt>
              <dd className="mt-0.5 text-ink">{bill.sponsor}</dd>
            </div>
          )}
          {introduced && (
            <div>
              <dt className="text-ink-3">Introduced</dt>
              <dd className="mt-0.5 text-ink">{introduced}</dd>
            </div>
          )}
          {bill.latest_major_action && (
            <div className="sm:col-span-2">
              <dt className="text-ink-3">Latest action{actionDate ? ` · ${actionDate}` : ""}</dt>
              <dd className="mt-0.5 text-ink">{bill.latest_major_action}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {officialUrl && (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-gold-bright hover:text-gold"
          >
            Read the full text on Congress.gov <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
        <a
          href={govtrackUrl(bill.congress, bill.bill_slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink"
        >
          Track on GovTrack <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}
