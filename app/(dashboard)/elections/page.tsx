// app/(dashboard)/elections/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import MemberScore from "@/models/MemberScore";
import { currentCycle } from "@/lib/fec";
import {
  loadElectionDates,
  loadRoster,
  mongoDatesStore,
  mongoRosterStore,
  liveDatesFetcher,
  liveRosterFetcher,
} from "@/lib/election-cache";
import { isValidStateCode } from "@/lib/states";
import StatePicker from "@/components/features/StatePicker";
import YourBallotCard, {
  type IncumbentInfo,
} from "@/components/features/YourBallotCard";
import UpcomingElectionsCalendar from "@/components/features/UpcomingElectionsCalendar";

export default async function ElectionsIndexPage() {
  const session = await auth();
  await connectDB();
  const cycle = currentCycle();

  const userState =
    session?.user?.state && isValidStateCode(session.user.state)
      ? session.user.state.toUpperCase()
      : null;
  const userDistrict = session?.user?.cd ?? null;

  // Three independent lookups for the user's ballot section. Each falls back
  // gracefully so a single failure (Mongo down, FEC throttle) never blanks the
  // page.
  const [nationalDates, stateDates, hasSenateRace, houseIncumbent] =
    await Promise.all([
      safeLoadDates("national", cycle),
      userState ? safeLoadDates(userState, cycle) : Promise.resolve([]),
      userState
        ? safeSenateOnBallot(userState, cycle)
        : Promise.resolve(false),
      userState && userDistrict
        ? safeFetchHouseIncumbent(userState, userDistrict)
        : Promise.resolve(null),
    ]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <header>
        <h1 className="font-brand text-3xl sm:text-4xl text-gradient mb-2">
          Elections
        </h1>
        <p className="text-cream/50 text-sm max-w-2xl">
          Federal candidates and campaign finance for the {cycle - 1}&ndash;
          {cycle} cycle. Heard tracks U.S. House, Senate, and Presidential
          races plus outside (Super PAC) spending — state and local races
          aren&apos;t covered yet.
        </p>
      </header>

      {userState ? (
        <YourBallotCard
          state={userState}
          district={userDistrict}
          hasSenateRace={hasSenateRace}
          stateDates={stateDates}
          houseIncumbent={houseIncumbent}
        />
      ) : (
        <NotSignedInPrompt />
      )}

      <UpcomingElectionsCalendar
        dates={nationalDates}
        highlightState={userState}
        title="Upcoming Federal Elections Nationwide"
        subtitle="Federal primary, runoff, and general election dates across all 50 states."
        viewAllHref="/elections/calendar"
        viewAllLabel="View full calendar"
      />

      <StatePicker />
    </div>
  );
}

function NotSignedInPrompt() {
  return (
    <section className="rounded-lg border border-glass-border bg-glass-bg p-5">
      <p className="text-cream font-medium text-sm">
        Sign in to see your ballot.
      </p>
      <p className="text-cream/50 text-xs mt-1">
        Once we know your state and congressional district, this page surfaces
        your next election date and the candidates running for your seat.{" "}
        <Link href="/login" className="text-gold hover:text-gold/80 underline">
          Log in
        </Link>{" "}
        or{" "}
        <Link href="/signup" className="text-gold hover:text-gold/80 underline">
          sign up
        </Link>
        .
      </p>
    </section>
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
    console.error("Election dates lookup failed for", scope, e);
    return [];
  }
}

async function safeSenateOnBallot(
  state: string,
  cycle: number
): Promise<boolean> {
  try {
    const senateRoster = await loadRoster(
      { state, office: "S", district: "", cycle },
      cycle,
      mongoRosterStore,
      liveRosterFetcher
    );
    return senateRoster.length > 0;
  } catch (e) {
    console.error("Senate roster lookup failed for", state, e);
    return false;
  }
}

async function safeFetchHouseIncumbent(
  state: string,
  district: string | number
): Promise<IncumbentInfo | null> {
  try {
    const districtNum = parseInt(String(district), 10);
    if (!Number.isFinite(districtNum)) return null;
    // MemberScore stores district as a Number. A state with a single
    // at-large seat sometimes uses null; query both shapes.
    const doc = await MemberScore.findOne({
      state,
      chamber: { $in: ["House", "House of Representatives"] },
      $or: [{ district: districtNum }, { district: null }],
    })
      .select("bioguideId name party district")
      .lean();
    if (!doc) return null;
    return {
      name: doc.name,
      party: doc.party,
      bioguideId: doc.bioguideId,
    };
  } catch (e) {
    console.error("House incumbent lookup failed for", state, district, e);
    return null;
  }
}
