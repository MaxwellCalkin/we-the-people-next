// app/(dashboard)/elections/[state]/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, ChevronRight } from "lucide-react";
import connectDB from "@/lib/db";
import { currentCycle, type ElectionDate } from "@/lib/fec";
import {
  loadElectionDates,
  loadRoster,
  mongoDatesStore,
  mongoRosterStore,
  liveDatesFetcher,
  liveRosterFetcher,
} from "@/lib/election-cache";
import { getStateInfo, stateName } from "@/lib/states";
import GlassCard from "@/components/ui/GlassCard";
import UpcomingElectionsCalendar from "@/components/features/UpcomingElectionsCalendar";

interface StatePageProps {
  params: Promise<{ state: string }>;
}

export default async function StateElectionsPage({ params }: StatePageProps) {
  const { state: stateParam } = await params;
  const state = stateParam.toUpperCase();
  const info = getStateInfo(state);
  if (!info) notFound();

  await connectDB();
  const cycle = currentCycle();

  let dates = await safeLoadDates(state, cycle);
  if (dates.length === 0) {
    dates = await safeLoadDates("national", cycle);
  }

  const senateRoster = await safeLoadRoster(state, "S", "", cycle);
  const senateHasRace = senateRoster.length > 0;

  // Find the date highlights for this state's federal races. Senate dates
  // typically share the state-wide primary day and the November general.
  const senateDates = upcomingByOffice(dates, "S");
  const houseDates = upcomingByOffice(dates, "H");
  const general = dates.find(
    (d) => d.type === "general" && yearOf(d.date) === cycle
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <header>
        <p className="text-cream/40 text-xs uppercase tracking-widest mb-1">
          <Link href="/elections" className="hover:text-cream">
            Elections
          </Link>
        </p>
        <h1 className="font-brand text-3xl sm:text-4xl text-gradient">
          {info.name}
        </h1>
        <p className="text-cream/40 text-sm mt-1">
          Federal races on the {cycle - 1}–{cycle} cycle ballot.
        </p>
      </header>

      <UpcomingElectionsCalendar
        dates={dates}
        title={`Upcoming Federal Election Dates in ${info.name}`}
        subtitle="Federal primary, runoff, and general election dates that affect this state."
      />

      <section>
        <div className="mb-3">
          <h2 className="font-brand text-lg text-cream">U.S. Senate</h2>
          <p className="text-cream/45 text-xs mt-0.5">
            {senateHasRace
              ? `One of ${info.name}'s two U.S. Senate seats is on the ${cycle} ballot. The other rotates onto a different six-year cycle.`
              : `Neither of ${info.name}'s two U.S. Senate seats is on the ${cycle} ballot. Each state's seats rotate on a six-year cycle, so a given state holds a Senate race in two out of every three federal cycles.`}
          </p>
        </div>

        {senateHasRace ? (
          <SenateRaceCard
            state={state}
            stateName={info.name}
            cycle={cycle}
            candidateCount={senateRoster.length}
            nextDate={senateDates[0] ?? general ?? null}
            general={general ?? null}
          />
        ) : (
          <GlassCard>
            <p className="text-cream/60 text-sm">
              No {info.name} Senate seat is being contested this cycle.
            </p>
          </GlassCard>
        )}
      </section>

      {info.houseDistricts > 0 && (
        <section>
          <div className="mb-3">
            <h2 className="font-brand text-lg text-cream">
              U.S. House — {info.houseDistricts} district
              {info.houseDistricts === 1 ? "" : "s"}
            </h2>
            <p className="text-cream/45 text-xs mt-0.5">
              All {info.houseDistricts}{" "}
              {info.houseDistricts === 1 ? "seat is" : "seats are"} on the{" "}
              {cycle} ballot — every U.S. House seat is up for election every
              two years.{" "}
              {houseDates[0] && (
                <>
                  Next House election date in {info.name}:{" "}
                  <span className="text-cream/70">
                    {formatShortDate(houseDates[0].date)}
                  </span>
                  .
                </>
              )}{" "}
              Click a district to see its candidates and campaign finance.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: info.houseDistricts }, (_, i) => i + 1).map(
              (n) => {
                const padded = String(n).padStart(2, "0");
                return (
                  <Link
                    key={padded}
                    href={`/elections/${state}/house/${padded}`}
                    className="rounded-md border border-glass-border bg-glass-bg px-3 py-2 text-sm text-cream/80 hover:text-cream hover:border-cream/30 transition-colors text-center tabular-nums"
                  >
                    {state}-{padded}
                  </Link>
                );
              }
            )}
          </div>
          {info.houseDistricts === 1 && (
            <p className="text-cream/40 text-xs mt-2">
              {stateName(state)} has one at-large House seat.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function SenateRaceCard({
  state,
  stateName,
  cycle,
  candidateCount,
  nextDate,
  general,
}: {
  state: string;
  stateName: string;
  cycle: number;
  candidateCount: number;
  nextDate: ElectionDate | null;
  general: ElectionDate | null;
}) {
  // If `nextDate` IS the general, don't show the general twice.
  const showGeneralSeparately =
    general && nextDate && general.date !== nextDate.date;

  return (
    <Link href={`/elections/${state}/senate`} className="block">
      <GlassCard hover>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-gold" />
              <span className="text-[0.6rem] uppercase tracking-widest text-gold/90">
                {cycle} Senate Race
              </span>
            </div>
            <p className="font-brand text-lg text-cream">
              {stateName} Senate seat
            </p>
            {nextDate && (
              <p className="text-cream/70 text-sm mt-1">
                Next election: {formatLongDate(nextDate.date)}
                {nextDate.type !== "general"
                  ? ` (${labelType(nextDate)})`
                  : " (General election)"}
              </p>
            )}
            {showGeneralSeparately && general && (
              <p className="text-cream/50 text-xs mt-0.5">
                General election: {formatLongDate(general.date)}
              </p>
            )}
            <p className="text-cream/50 text-xs mt-2">
              {candidateCount} candidate{candidateCount === 1 ? "" : "s"} have
              filed with the FEC for this race
            </p>
            <p className="text-gold/80 text-xs mt-2">
              See candidates, finance, and outside spending →
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-cream/40 shrink-0 mt-1" />
        </div>
      </GlassCard>
    </Link>
  );
}

// ── helpers ────────────────────────────────────────────────────────

function yearOf(iso: string): number {
  return new Date(iso).getFullYear();
}

function upcomingByOffice(dates: ElectionDate[], office: "H" | "S"): ElectionDate[] {
  const today = new Date();
  const startMs = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();
  return dates
    .filter(
      (d) =>
        d.office === office &&
        !isNaN(new Date(d.date).getTime()) &&
        new Date(d.date).getTime() >= startMs
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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

function labelType(d: ElectionDate): string {
  const base =
    d.type === "primary"
      ? "Primary"
      : d.type === "runoff"
        ? "Runoff"
        : d.type === "special"
          ? "Special election"
          : d.type === "general"
            ? "General"
            : "Election";
  if (d.party && d.type === "primary") {
    return `${d.party} ${base.toLowerCase()}`;
  }
  return base;
}

async function safeLoadDates(scope: string, electionYear: number) {
  try {
    return await loadElectionDates(
      scope,
      electionYear,
      mongoDatesStore,
      liveDatesFetcher
    );
  } catch (e) {
    console.error("Election dates lookup failed for", scope, e);
    return [];
  }
}

async function safeLoadRoster(
  state: string,
  office: "H" | "S",
  district: string,
  cycle: number
) {
  try {
    return await loadRoster(
      { state, office, district, cycle },
      cycle,
      mongoRosterStore,
      liveRosterFetcher
    );
  } catch (e) {
    console.error("Roster lookup failed for", state, office, district, e);
    return [];
  }
}
