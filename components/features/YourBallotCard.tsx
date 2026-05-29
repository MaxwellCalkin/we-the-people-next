// components/features/YourBallotCard.tsx
//
// Top-of-index hero for users whose state (and ideally CD) is known. Answers
// the questions a politically-cold user is actually asking when they land on
// /elections:
//   1. When can I vote next?
//   2. What's that election for, exactly?
//   3. Who currently holds those seats?
//
// The "Next Election" block is itself a clickable card that drills into the
// most specific race it can — straight to the House race detail page when the
// upcoming date is for a House office, etc.

import Link from "next/link";
import { Calendar, ChevronRight, MapPin } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { stateName } from "@/lib/states";
import type { ElectionDate, ElectionType, FecOffice } from "@/lib/fec";

export interface IncumbentInfo {
  name: string;
  party: string;
  bioguideId: string;
}

interface YourBallotCardProps {
  state: string;
  district?: string | null;
  hasSenateRace: boolean;
  /** State-scoped election dates (already cached). Past dates are filtered here. */
  stateDates: ElectionDate[];
  /** Current sitting House member for the user's district, or null if unknown. */
  houseIncumbent: IncumbentInfo | null;
  /** Override for "now" — tests only. */
  now?: Date;
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

function formatLongDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function daysFromNow(iso: string, now: Date): number {
  const target = new Date(iso);
  if (isNaN(target.getTime())) return Infinity;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function findGeneralElection(
  dates: ElectionDate[],
  cycleYear: number
): ElectionDate | null {
  return (
    dates.find(
      (d) =>
        d.type === "general" &&
        new Date(d.date).getFullYear() === cycleYear
    ) ?? null
  );
}

interface NextElectionSummary {
  date: string;
  type: ElectionType;
  party: string | null;
  /** Offices being elected on this date (across all matching FEC rows). */
  offices: FecOffice[];
}

/**
 * Identify the soonest upcoming election day for the state, then merge ALL
 * rows sharing that date so we know every office on the ballot (FEC returns
 * one row per office per date).
 */
function findNextElectionSummary(
  dates: ElectionDate[],
  now: Date
): NextElectionSummary | null {
  const startMs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const upcoming = dates
    .filter((d) => {
      const t = new Date(d.date).getTime();
      return !isNaN(t) && t >= startMs;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  if (upcoming.length === 0) return null;

  const first = upcoming[0];
  const sameDay = upcoming.filter(
    (d) =>
      d.date === first.date && d.type === first.type && d.party === first.party
  );
  const offices: FecOffice[] = [];
  for (const d of sameDay) {
    if (d.office && !offices.includes(d.office)) offices.push(d.office);
  }
  return {
    date: first.date,
    type: first.type,
    party: first.party,
    offices,
  };
}

function nextElectionHref(
  state: string,
  district: string | null,
  next: NextElectionSummary
): string {
  if (next.offices.length === 1) {
    const only = next.offices[0];
    if (only === "H" && district) {
      return `/elections/${state}/house/${district}`;
    }
    if (only === "S") return `/elections/${state}/senate`;
  }
  return `/elections/${state}`;
}

function describeNextElection(
  next: NextElectionSummary
): { headline: string; sub: string | null } {
  const typeLabel = TYPE_LABEL[next.type];
  const officeNames = next.offices.map((o) => OFFICE_LABEL[o]);
  const officeJoined =
    officeNames.length === 0
      ? ""
      : officeNames.length === 1
        ? officeNames[0]
        : officeNames.slice(0, -1).join(", ") +
          " and " +
          officeNames[officeNames.length - 1];

  // Headline like "Democratic Primary — U.S. House" or "General Election — U.S. House and Senate"
  const partyPrefix =
    next.party && next.type === "primary"
      ? `${next.party.charAt(0).toUpperCase()}${next.party.slice(1).toLowerCase()} `
      : "";
  const headline = officeJoined
    ? `${partyPrefix}${typeLabel} — ${officeJoined}`
    : `${partyPrefix}${typeLabel}`;
  return { headline, sub: null };
}

export default function YourBallotCard({
  state,
  district,
  hasSenateRace,
  stateDates,
  houseIncumbent,
  now = new Date(),
}: YourBallotCardProps) {
  const stateUpper = state.toUpperCase();
  const districtPadded = district ? String(district).padStart(2, "0") : null;
  const districtNum = districtPadded ? parseInt(districtPadded, 10) : null;

  const cycleYear = now.getFullYear() % 2 === 0
    ? now.getFullYear()
    : now.getFullYear() + 1;

  const next = findNextElectionSummary(stateDates, now);
  const general = findGeneralElection(stateDates, cycleYear);
  const showSeparateGeneral =
    general && next && next.date !== general.date;

  const days = next ? daysFromNow(next.date, now) : null;
  const nextHref = next
    ? nextElectionHref(stateUpper, districtPadded, next)
    : null;
  const nextDesc = next ? describeNextElection(next) : null;

  // If the soonest race is the user's House race, surface the House incumbent
  // inside the callout. We don't track Senate incumbents-on-ballot precisely
  // enough to do the same for S yet.
  const showHouseIncumbentInCallout =
    !!next &&
    !!houseIncumbent &&
    next.offices.length === 1 &&
    next.offices[0] === "H";

  return (
    <section>
      <h2 className="text-[0.65rem] uppercase tracking-widest text-cream/40 mb-3">
        Your {cycleYear} Ballot
      </h2>

      <GlassCard className="mb-4">
        <div className="flex items-start gap-3 mb-4">
          <MapPin className="h-4 w-4 text-gold/80 mt-1 shrink-0" />
          <div className="min-w-0">
            <p className="text-cream font-medium text-sm">
              {stateName(stateUpper)}
              {districtNum && (
                <span className="text-cream/60">
                  {" "}
                  · Congressional District {districtNum}
                </span>
              )}
            </p>
            <p className="text-cream/40 text-xs mt-0.5">
              Based on your saved profile.{" "}
              <Link href="/profile" className="text-gold/70 hover:text-gold">
                Change
              </Link>
            </p>
          </div>
        </div>

        {next && nextHref && nextDesc ? (
          <Link href={nextHref} className="block mb-4">
            <div className="rounded-md border border-gold/40 bg-gold/[0.06] hover:bg-gold/[0.1] transition-colors p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-gold" />
                    <span className="text-[0.6rem] uppercase tracking-widest text-gold/90">
                      Your Next Election
                    </span>
                  </div>
                  <p className="text-cream font-brand text-lg leading-tight">
                    {nextDesc.headline}
                  </p>
                  <p className="text-cream/70 text-sm mt-1">
                    {formatLongDate(next.date)}
                  </p>
                  <p className="text-cream/50 text-xs mt-1">
                    {days === 0
                      ? "Today"
                      : days === 1
                        ? "Tomorrow"
                        : days != null && days > 0
                          ? `${days} days from now`
                          : ""}
                  </p>
                  {showHouseIncumbentInCallout && houseIncumbent && (
                    <p className="text-cream/60 text-xs mt-2 pt-2 border-t border-white/5">
                      Seat currently held by{" "}
                      <span className="text-cream">{houseIncumbent.name}</span>{" "}
                      <span className="text-cream/50">
                        ({houseIncumbent.party?.[0] ?? "?"})
                      </span>
                    </p>
                  )}
                  <p className="text-gold/80 text-xs mt-2">
                    See candidates and finance →
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gold/60 shrink-0 mt-1" />
              </div>
            </div>
          </Link>
        ) : (
          <p className="text-cream/40 text-xs mb-4">
            No upcoming federal election dates on file for {stateName(stateUpper)}.
          </p>
        )}

        <div>
          <p className="text-[0.6rem] uppercase tracking-widest text-cream/40 mb-2">
            Federal races on your ballot this cycle
          </p>
          <div className="space-y-2">
            {districtPadded && (
              <RaceRow
                href={`/elections/${stateUpper}/house/${districtPadded}`}
                office="U.S. House"
                title={`${stateUpper}-${districtPadded}`}
                incumbentLabel={
                  houseIncumbent
                    ? `Currently held by ${houseIncumbent.name} (${
                        houseIncumbent.party?.[0] ?? "?"
                      })`
                    : "See candidates and finance →"
                }
              />
            )}
            {hasSenateRace && (
              <RaceRow
                href={`/elections/${stateUpper}/senate`}
                office="U.S. Senate"
                title={`${stateName(stateUpper)} Senate seat`}
                incumbentLabel="Senate seat up this cycle — see candidates and finance →"
              />
            )}
            {!hasSenateRace && (
              <p className="text-cream/40 text-xs italic">
                No U.S. Senate seat from {stateName(stateUpper)}{" "}
                on the ballot this cycle. (Each state&apos;s two Senate seats
                rotate on a six-year cycle.)
              </p>
            )}
          </div>
        </div>

        {showSeparateGeneral && general && (
          <p className="text-cream/40 text-[0.7rem] mt-4">
            General election:{" "}
            <span className="text-cream/60">
              {formatLongDate(general.date)}
            </span>
          </p>
        )}
      </GlassCard>
    </section>
  );
}

function RaceRow({
  href,
  office,
  title,
  incumbentLabel,
}: {
  href: string;
  office: string;
  title: string;
  incumbentLabel: string;
}) {
  return (
    <Link href={href} className="block">
      <div className="flex items-center justify-between gap-3 rounded-md border border-glass-border bg-glass-bg px-3 py-2.5 hover:border-cream/30 transition-colors">
        <div className="min-w-0">
          <p className="text-[0.6rem] uppercase tracking-widest text-cream/40">
            {office}
          </p>
          <p className="text-cream font-medium text-sm mt-0.5">{title}</p>
          <p className="text-cream/50 text-xs mt-0.5 truncate">
            {incumbentLabel}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-cream/40 shrink-0" />
      </div>
    </Link>
  );
}
