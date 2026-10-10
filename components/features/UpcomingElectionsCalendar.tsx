// components/features/UpcomingElectionsCalendar.tsx
//
// Shows upcoming federal election dates grouped by (date + state + type) so
// the user sees one row per "election day" per place, with the offices being
// filled spelled out. The raw FEC /election-dates/ feed often returns one row
// per office (House row, Senate row, etc.) on the same date — without
// grouping the list looks duplicated and meaningless.

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import { stateName } from "@/lib/states";
import type { ElectionDate, ElectionType, FecOffice } from "@/lib/fec";

interface UpcomingElectionsCalendarProps {
  dates: ElectionDate[];
  /** The source could not be loaded; do not confuse this with no dates. */
  unavailable?: boolean;
  /** Max number of grouped rows to show. */
  limit?: number;
  /** Highlight rows for this state (the user's). */
  highlightState?: string | null;
  /** Override for "today" — tests only. */
  now?: Date;
  /** Heading text override; defaults to "Upcoming Federal Elections". */
  title?: string;
  /** Optional subtitle / explainer below the heading. */
  subtitle?: string;
  /**
   * If set, the heading becomes a link and a footer "view all" link is shown.
   * Used on the elections index to drill into the full calendar page.
   */
  viewAllHref?: string;
  /** Footer link label. Ignored when viewAllHref is unset. */
  viewAllLabel?: string;
  /** Optional month grouping (used by the dedicated calendar page). */
  groupByMonth?: boolean;
}

const TYPE_LABEL: Record<ElectionType, string> = {
  primary: "Primary",
  general: "General Election",
  runoff: "Runoff",
  special: "Special Election",
  other: "Election",
};

const OFFICE_LABEL: Record<FecOffice, string> = {
  H: "U.S. House",
  S: "U.S. Senate",
  P: "President",
};

interface GroupedElection {
  date: string;
  state: string | null;
  type: ElectionType;
  party: string | null;
  offices: FecOffice[];
}

function groupKey(d: ElectionDate): string {
  return [d.date, d.state ?? "_", d.type, d.party ?? "_"].join("|");
}

// FEC election dates are calendar dates, not instants in the viewer's timezone.
function calendarDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

function formatMonth(iso: string): string {
  const d = calendarDate(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short" });
}

function formatDayNumber(iso: string): string {
  const d = calendarDate(iso);
  if (isNaN(d.getTime())) return iso;
  return String(d.getDate());
}

function formatDayOfWeek(iso: string): string {
  const d = calendarDate(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function buildHref(g: GroupedElection): string {
  // National rows (no state) — go to the elections home, which surfaces the
  // general-election context.
  if (!g.state) return "/elections";

  // Single-office rows can deep-link straight into that race:
  //   Senate-only → /elections/[state]/senate
  //   House-only with a single specific district → /elections/[state]/house/[district]
  // Multi-office or House-without-district falls through to the state overview.
  const offices = [...new Set(g.offices)];
  if (offices.length === 1) {
    const only = offices[0];
    if (only === "S") return `/elections/${g.state}/senate`;
  }

  return `/elections/${g.state}`;
}

function buildLabel(g: GroupedElection): {
  scope: string;
  what: string;
} {
  const place = g.state ? stateName(g.state) : "Nationwide";
  const partyLabel = g.party
    ? ` (${g.party.toUpperCase()})`
    : "";
  const typeLabel = TYPE_LABEL[g.type];

  // Offices: show full names. If the only office is a House race AND there's
  // no district context (statewide row), say "U.S. House races". If multiple
  // offices, comma-join.
  const officeNames = g.offices
    .filter((o): o is FecOffice => !!o)
    .map((o) => OFFICE_LABEL[o]);
  const uniqueOffices = [...new Set(officeNames)];

  const officesLabel =
    uniqueOffices.length === 0
      ? "federal offices"
      : uniqueOffices.join(", ");

  return {
    scope: `${place} ${typeLabel.toLowerCase()}${partyLabel}`,
    what: `For ${officesLabel}`,
  };
}

export default function UpcomingElectionsCalendar({
  dates,
  unavailable = false,
  limit = 6,
  highlightState,
  now = new Date(),
  title = "Upcoming federal election dates",
  subtitle,
  viewAllHref,
  viewAllLabel = "View full calendar",
  groupByMonth = false,
}: UpcomingElectionsCalendarProps) {
  const startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const upcoming = dates.filter((d) => {
    const t = calendarDate(d.date).getTime();
    return !isNaN(t) && t >= startMs;
  });

  // Group by (date, state, type, party) and accumulate offices.
  const groups = new Map<string, GroupedElection>();
  for (const d of upcoming) {
    const k = groupKey(d);
    const existing = groups.get(k);
    if (existing) {
      if (d.office && !existing.offices.includes(d.office)) {
        existing.offices.push(d.office);
      }
    } else {
      groups.set(k, {
        date: d.date,
        state: d.state,
        type: d.type,
        party: d.party,
        offices: d.office ? [d.office] : [],
      });
    }
  }

  const sorted = [...groups.values()].sort((a, b) => a.date.localeCompare(b.date));
  const visible = limit ? sorted.slice(0, limit) : sorted;
  const truncated = sorted.length > visible.length;

  const highlightUpper = highlightState?.toUpperCase() ?? null;

  const renderRow = (g: GroupedElection, key: string) => {
    const isUser = !!highlightUpper && !!g.state && g.state === highlightUpper;
    const { scope, what } = buildLabel(g);
    const href = buildHref(g);
    return (
      <li key={key}>
        <Link
          href={href}
          className="group -mx-2 flex items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-white/[0.03]"
        >
          <span
            className={`flex w-14 shrink-0 flex-col items-center rounded-xl border py-1.5 ${
              isUser ? "border-gold/50 bg-gold/10" : "border-line-strong bg-surface-2"
            }`}
          >
            <span className={`text-[0.7rem] font-semibold uppercase tracking-wider ${isUser ? "text-gold-bright" : "text-ink-3"}`}>
              {formatMonth(g.date)}
            </span>
            <span className="text-xl font-semibold leading-tight tabular-nums text-ink">{formatDayNumber(g.date)}</span>
            <span className="text-[0.7rem] text-ink-3">{formatDayOfWeek(g.date)}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium capitalize text-ink">{scope}</span>
              {isUser && (
                <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold-bright">
                  Your state
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-sm text-ink-3">{what}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </li>
    );
  };

  // When grouping by month, split visible into monthly sections and prepend
  // a header li per month. Otherwise a flat list.
  let listChildren: React.ReactNode;
  if (groupByMonth) {
    const byMonth = new Map<string, GroupedElection[]>();
    for (const g of visible) {
      const monthKey = g.date.slice(0, 7); // "2026-06"
      const arr = byMonth.get(monthKey) ?? [];
      arr.push(g);
      byMonth.set(monthKey, arr);
    }
    listChildren = [...byMonth.entries()].map(([monthKey, entries]) => (
      <li key={monthKey} className="pt-5 first:pt-0">
        <h3 className="mb-1 text-sm font-semibold text-ink-2">{monthLabel(monthKey)}</h3>
        <ul className="divide-y divide-line/70">
          {entries.map((g, i) => renderRow(g, `${g.date}-${g.state ?? ""}-${g.type}-${i}`))}
        </ul>
      </li>
    ));
  } else {
    listChildren = visible.map((g, i) => renderRow(g, `${g.date}-${g.state ?? ""}-${g.type}-${i}`));
  }

  return (
    <Card as="section">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {viewAllHref ? (
            <Link href={viewAllHref} className="inline-flex items-center gap-1 text-lg font-semibold text-ink hover:text-gold-bright">
              {title}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
          )}
          {subtitle && <p className="mt-1 text-sm leading-relaxed text-ink-3">{subtitle}</p>}
        </div>
        <span className="shrink-0 rounded-full border border-line-strong px-2.5 py-0.5 text-xs text-ink-3">Source: FEC</span>
      </div>
      {unavailable && (
        <Alert tone="warning" className="mt-4">
          Some election dates could not be loaded. The list may be incomplete; check your election office for confirmed dates.
        </Alert>
      )}
      {visible.length === 0 && !unavailable && (
        <p className="mt-4 rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm leading-relaxed text-ink-3">
          No upcoming dates were returned by the FEC for this selection. State and local elections may still be scheduled.
        </p>
      )}
      {visible.length > 0 && (
        <ul className={`mt-4 ${groupByMonth ? "" : "divide-y divide-line/70"}`}>{listChildren}</ul>
      )}
      {viewAllHref && truncated && (
        <div className="mt-3 border-t border-line pt-3">
          <Link href={viewAllHref} className="inline-flex items-center gap-1 text-sm font-medium text-gold-bright hover:text-gold">
            {viewAllLabel} ({sorted.length - visible.length} more)
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </Card>
  );
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map((n) => parseInt(n, 10));
  if (!year || !month) return monthKey;
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
