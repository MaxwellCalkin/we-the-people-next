// components/features/UpcomingElectionsCalendar.tsx
//
// Shows upcoming federal election dates grouped by (date + state + type) so
// the user sees one row per "election day" per place, with the offices being
// filled spelled out. The raw FEC /election-dates/ feed often returns one row
// per office (House row, Senate row, etc.) on the same date — without
// grouping the list looks duplicated and meaningless.

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { stateName } from "@/lib/states";
import type { ElectionDate, ElectionType, FecOffice } from "@/lib/fec";

interface UpcomingElectionsCalendarProps {
  dates: ElectionDate[];
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

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDayOfWeek(iso: string): string {
  const d = new Date(iso);
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
  limit = 6,
  highlightState,
  now = new Date(),
  title = "Upcoming Federal Elections",
  subtitle,
  viewAllHref,
  viewAllLabel = "View full calendar",
  groupByMonth = false,
}: UpcomingElectionsCalendarProps) {
  const startMs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  const upcoming = dates.filter((d) => {
    const t = new Date(d.date).getTime();
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

  const sorted = [...groups.values()].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const visible = limit ? sorted.slice(0, limit) : sorted;
  const truncated = sorted.length > visible.length;

  if (visible.length === 0) return null;

  const highlightUpper = highlightState?.toUpperCase() ?? null;

  const renderRow = (g: GroupedElection, key: string) => {
    const isUser =
      !!highlightUpper && !!g.state && g.state === highlightUpper;
    const { scope, what } = buildLabel(g);
    const href = buildHref(g);
    return (
      <li key={key} className="first:[&>a>div]:pt-0 last:[&>a>div]:pb-0">
        <Link href={href} className="block">
          <div className="flex items-start gap-3 py-2.5 px-1 -mx-1 rounded-md transition-colors hover:bg-white/[0.03]">
            <div className="w-12 shrink-0 text-right">
              <div className="text-cream font-medium text-sm tabular-nums">
                {formatShortDate(g.date)}
              </div>
              <div className="text-cream/40 text-[0.65rem] uppercase tracking-wider">
                {formatDayOfWeek(g.date)}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-cream text-sm capitalize">
                {scope}
                {isUser && (
                  <span className="ml-2 text-[0.55rem] uppercase tracking-widest text-gold border border-gold/40 rounded px-1.5 py-0.5 align-middle">
                    Your state
                  </span>
                )}
              </p>
              <p className="text-cream/45 text-xs mt-0.5">{what}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-cream/30 shrink-0 mt-0.5" />
          </div>
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
      <li key={monthKey}>
        <h3 className="text-[0.65rem] uppercase tracking-widest text-cream/50 mt-4 mb-1 first:mt-0">
          {monthLabel(monthKey)}
        </h3>
        <ul className="divide-y divide-white/5">
          {entries.map((g, i) =>
            renderRow(g, `${g.date}-${g.state ?? ""}-${g.type}-${i}`)
          )}
        </ul>
      </li>
    ));
  } else {
    listChildren = visible.map((g, i) =>
      renderRow(g, `${g.date}-${g.state ?? ""}-${g.type}-${i}`)
    );
  }

  return (
    <GlassCard>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="font-brand text-lg text-cream hover:text-gold inline-flex items-center gap-1"
          >
            {title}
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <h2 className="font-brand text-lg text-cream">{title}</h2>
        )}
        <span className="text-cream/40 text-xs shrink-0">Source: FEC</span>
      </div>
      {subtitle && (
        <p className="text-cream/40 text-xs mb-3 leading-relaxed">
          {subtitle}
        </p>
      )}
      <ul className={groupByMonth ? "" : "divide-y divide-white/5"}>
        {listChildren}
      </ul>
      {viewAllHref && truncated && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 text-gold/90 hover:text-gold text-xs"
          >
            {viewAllLabel} ({sorted.length - visible.length} more)
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </GlassCard>
  );
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map((n) => parseInt(n, 10));
  if (!year || !month) return monthKey;
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
