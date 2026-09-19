// components/features/YourBallotCard.tsx
//
// Profile-based federal research overview. A state and congressional district
// do not establish an exact ballot or eligibility for a particular election.

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
  const d = calendarDate(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function daysFromNow(iso: string, now: Date): number {
  const target = calendarDate(iso);
  if (isNaN(target.getTime())) return Infinity;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function calendarDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

function findGeneralElection(
  dates: ElectionDate[],
  cycleYear: number
): ElectionDate | null {
  return (
    dates.find(
      (d) =>
        d.type === "general" &&
        calendarDate(d.date).getFullYear() === cycleYear
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
 * rows sharing that date to summarize the offices in the FEC date records.
 * These are statewide records, not an address-matched ballot.
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
      const t = calendarDate(d.date).getTime();
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
      <h2 className="text-xs uppercase tracking-widest text-cream/75 mb-3">
        Federal research for your profile · {cycleYear}
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
            <p className="text-cream/75 text-sm mt-1">
              Based on your saved profile, not an address-matched ballot.{" "}
              <Link href="/profile" className="text-gold hover:text-gold underline">
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
                    <span className="text-xs uppercase tracking-wider text-gold/90">
                      Next listed federal date in {stateUpper}
                    </span>
                  </div>
                  <p className="text-cream font-brand text-lg leading-tight">
                    {nextDesc.headline}
                  </p>
                  <p className="text-cream/70 text-sm mt-1">
                    {formatLongDate(next.date)}
                  </p>
                  <p className="text-cream/75 text-sm mt-1">
                    {days === 0
                      ? "Today"
                      : days === 1
                        ? "Tomorrow"
                        : days != null && days > 0
                          ? `${days} days from now`
                          : ""}
                  </p>
                  <p className="text-cream/75 text-sm mt-2">
                    This statewide date may not apply to your address or primary
                    eligibility. Confirm with your election office.
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
                  <p className="text-gold text-sm mt-2">
                    Explore federal research →
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gold/60 shrink-0 mt-1" />
              </div>
            </div>
          </Link>
        ) : (
          <p className="text-cream/75 text-sm mb-4">
            Upcoming federal dates for {stateName(stateUpper)} are unavailable
            here. Check your election office for confirmed dates.
          </p>
        )}

        <div>
          <p className="text-xs uppercase tracking-wider text-cream/75 mb-2">
            Explore federal candidate records
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
                incumbentLabel="FEC candidate records and campaign finance →"
              />
            )}
            {!hasSenateRace && (
              <p className="text-cream/75 text-sm">
                Senate candidate records are not available in this overview.
                This does not establish whether a Senate election will be held.{" "}
                <Link href={`/elections/${stateUpper}/senate`} className="text-gold underline">
                  Check federal research
                </Link>
              </p>
            )}
          </div>
        </div>

        {showSeparateGeneral && general && (
          <p className="text-cream/75 text-sm mt-4">
            Listed federal general election date:{" "}
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
          <p className="text-xs uppercase tracking-wider text-cream/75">
            {office}
          </p>
          <p className="text-cream font-medium text-sm mt-0.5">{title}</p>
          <p className="text-cream/75 text-sm mt-0.5">
            {incumbentLabel}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-cream/40 shrink-0" />
      </div>
    </Link>
  );
}
