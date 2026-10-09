// app/(dashboard)/elections/calendar/page.tsx
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import { currentCycle, type ElectionDate } from "@/lib/fec";
import { loadElectionDates, mongoDatesStore, liveDatesFetcher } from "@/lib/election-cache";
import { isValidStateCode, stateName } from "@/lib/states";
import UpcomingElectionsCalendar from "@/components/features/UpcomingElectionsCalendar";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Federal election calendar" };

interface PageProps {
  searchParams: Promise<{ state?: string; mine?: string }>;
}

export default async function ElectionsCalendarPage({ searchParams }: PageProps) {
  const { state: stateParam, mine } = await searchParams;
  const session = await auth();
  await connectDB();
  const cycle = currentCycle();

  const userState =
    session?.user?.state && isValidStateCode(session.user.state) ? session.user.state.toUpperCase() : null;

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
  let dates: ElectionDate[] = dateResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const datesUnavailable = dateResults.some((result) => result.status === "rejected");

  // /election-dates/?election_state=XX should already constrain, but
  // defensively filter in case FEC returns nationwide rows mixed in.
  if (activeStateFilter) {
    dates = dates.filter((d) => !d.state || d.state.toUpperCase() === activeStateFilter);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        breadcrumbs={[{ label: "Elections", href: "/elections" }, { label: "Calendar" }]}
        title="Federal election calendar"
        description={
          <>
            Federal dates published by the FEC for {years[0]} through {years[years.length - 1]}. This calendar may be
            incomplete and doesn&apos;t include state or local elections. Confirm dates and eligibility with your election
            office.
          </>
        }
      />

      <CalendarFilterBar
        userState={userState}
        active={activeStateFilter}
        explicitStateParam={stateParam && isValidStateCode(stateParam) ? stateParam.toUpperCase() : null}
      />

      <UpcomingElectionsCalendar
        dates={dates}
        unavailable={datesUnavailable}
        limit={1000}
        highlightState={userState}
        groupByMonth
        title={
          activeStateFilter ? `Upcoming federal elections in ${stateName(activeStateFilter)}` : "Upcoming federal dates on file"
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
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm text-ink-3">Show</span>
      <FilterPill href="/elections/calendar" active={!active} label="All states" />
      {userState && (
        <FilterPill href="/elections/calendar?mine=1" active={active === userState} label={`Only ${stateName(userState)}`} />
      )}
      {explicitStateParam && explicitStateParam !== userState && (
        <FilterPill
          href={`/elections/calendar?state=${explicitStateParam}`}
          active={active === explicitStateParam}
          label={`Only ${stateName(explicitStateParam)}`}
        />
      )}
      <span className="ml-1 hidden text-sm text-ink-3 sm:inline">
        or browse{" "}
        <Link href="/elections#browse" className="font-medium text-gold-bright underline-offset-2 hover:underline">
          any state&apos;s page
        </Link>
      </span>
    </div>
  );
}

function FilterPill({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? "border-gold/60 bg-gold/10 font-medium text-gold-bright"
          : "border-line-strong text-ink-2 hover:border-line-input hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}
