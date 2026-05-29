// app/(dashboard)/elections/calendar/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import { currentCycle, type ElectionDate } from "@/lib/fec";
import {
  loadElectionDates,
  mongoDatesStore,
  liveDatesFetcher,
} from "@/lib/election-cache";
import { isValidStateCode, stateName } from "@/lib/states";
import UpcomingElectionsCalendar from "@/components/features/UpcomingElectionsCalendar";

interface PageProps {
  searchParams: Promise<{ state?: string; mine?: string }>;
}

export default async function ElectionsCalendarPage({ searchParams }: PageProps) {
  const { state: stateParam, mine } = await searchParams;
  const session = await auth();
  await connectDB();
  const cycle = currentCycle();

  const userState =
    session?.user?.state && isValidStateCode(session.user.state)
      ? session.user.state.toUpperCase()
      : null;

  // Resolve filter: "?mine=1" wins if the user has a state on file; otherwise
  // ?state=XX (case-insensitive) takes effect.
  let activeStateFilter: string | null = null;
  if (mine === "1" && userState) {
    activeStateFilter = userState;
  } else if (stateParam && isValidStateCode(stateParam)) {
    activeStateFilter = stateParam.toUpperCase();
  }

  // Multi-year fetch. Each year is cached independently for 7 days. We pull
  // the current cycle plus the next two so users can see runoffs, special
  // elections, and the next presidential primaries — not just May–November
  // of one year.
  const years = [cycle, cycle + 1, cycle + 2];
  const dateArrays = await Promise.all(
    years.map((y) =>
      activeStateFilter
        ? safeLoadDates(activeStateFilter, y)
        : safeLoadDates("national", y)
    )
  );
  let dates: ElectionDate[] = dateArrays.flat();

  // /election-dates/?election_state=XX should already constrain, but
  // defensively filter in case FEC returns nationwide rows mixed in.
  if (activeStateFilter) {
    dates = dates.filter(
      (d) => !d.state || d.state.toUpperCase() === activeStateFilter
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <header>
        <p className="text-cream/40 text-xs uppercase tracking-widest mb-1">
          <Link href="/elections" className="hover:text-cream">
            Elections
          </Link>
        </p>
        <h1 className="font-brand text-3xl sm:text-4xl text-gradient">
          Full Election Calendar
        </h1>
        <p className="text-cream/50 text-sm mt-2 max-w-2xl">
          Every federal primary, runoff, and general election from{" "}
          {years[0]} through {years[years.length - 1]}. Click any row to jump
          to that race&apos;s candidates and campaign finance. Years beyond the
          current cycle may be sparse until FEC publishes them.
        </p>
      </header>

      <CalendarFilterBar
        userState={userState}
        active={activeStateFilter}
        explicitStateParam={
          stateParam && isValidStateCode(stateParam)
            ? stateParam.toUpperCase()
            : null
        }
      />

      <UpcomingElectionsCalendar
        dates={dates}
        limit={1000}
        highlightState={userState}
        groupByMonth
        title={
          activeStateFilter
            ? `Upcoming federal elections in ${stateName(activeStateFilter)}`
            : "All upcoming federal elections"
        }
        subtitle={
          activeStateFilter
            ? `Only elections that affect ${stateName(activeStateFilter)} are shown. Clear the filter to see every state.`
            : "Federal primary, runoff, and general election dates across all 50 states, D.C., and the territories."
        }
      />
    </div>
  );
}

function CalendarFilterBar({
  userState,
  active,
  explicitStateParam,
}: {
  userState: string | null;
  active: string | null;
  explicitStateParam: string | null;
}) {
  const showMineButton = !!userState;
  const mineActive = active === userState;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-cream/40 text-xs uppercase tracking-widest mr-1">
        Show:
      </span>
      <FilterPill
        href="/elections/calendar"
        active={!active}
        label="All states"
      />
      {showMineButton && (
        <FilterPill
          href="/elections/calendar?mine=1"
          active={mineActive}
          label={`Only ${stateName(userState)}`}
        />
      )}
      {explicitStateParam && explicitStateParam !== userState && (
        <FilterPill
          href={`/elections/calendar?state=${explicitStateParam}`}
          active={active === explicitStateParam}
          label={`Only ${stateName(explicitStateParam)}`}
        />
      )}
      <span className="text-cream/35 text-xs hidden sm:inline">
        or browse{" "}
        <Link
          href="/elections#browse"
          className="text-gold/70 hover:text-gold underline"
        >
          any state&apos;s page
        </Link>{" "}
        and follow the date link.
      </span>
    </div>
  );
}

function FilterPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`text-xs rounded-md px-2.5 py-1 border transition-colors ${
        active
          ? "border-gold/60 bg-gold/10 text-gold"
          : "border-glass-border bg-glass-bg text-cream/70 hover:text-cream hover:border-cream/30"
      }`}
    >
      {label}
    </Link>
  );
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
    console.error("Election dates lookup failed for", scope, electionYear, e);
    return [];
  }
}
