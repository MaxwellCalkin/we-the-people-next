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
  const dateResults = await Promise.allSettled(
    years.map((y) =>
      activeStateFilter
        ? loadElectionDates(activeStateFilter, y, mongoDatesStore, liveDatesFetcher)
        : loadElectionDates("national", y, mongoDatesStore, liveDatesFetcher)
    )
  );
  let dates: ElectionDate[] = dateResults.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
  const datesUnavailable = dateResults.some((result) => result.status === "rejected");

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
        <p className="text-cream/70 text-xs uppercase tracking-widest mb-1">
          <Link href="/elections" className="hover:text-cream">
            Elections
          </Link>
        </p>
        <h1 className="font-brand text-3xl sm:text-4xl text-gradient">
          Federal Election Calendar
        </h1>
        <p className="text-cream/75 text-sm mt-2 max-w-2xl leading-relaxed">
          Federal dates published by the FEC for {years[0]} through {years[years.length - 1]}.
          Open a date for related federal research. This calendar may be incomplete
          and does not include state or local elections. Confirm dates and
          eligibility with your election office.
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
        unavailable={datesUnavailable}
        limit={1000}
        highlightState={userState}
        groupByMonth
        title={
          activeStateFilter
            ? `Upcoming federal elections in ${stateName(activeStateFilter)}`
            : "Upcoming federal dates on file"
        }
        subtitle={
          activeStateFilter
            ? `Dates listed for ${stateName(activeStateFilter)}. A statewide date may not apply to your address or primary eligibility.`
            : "Federal primary, runoff, and general election dates by state. Coverage depends on the FEC records available."
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
      <span className="text-cream/70 text-xs uppercase tracking-widest mr-1">
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
      <span className="text-cream/70 text-sm hidden sm:inline">
        or browse{" "}
        <Link
          href="/elections#browse"
          className="text-gold hover:text-gold underline"
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
