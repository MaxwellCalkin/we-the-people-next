export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import connectDB from "@/lib/db";
import { currentCycle } from "@/lib/fec";
import {
  loadElectionDates,
  loadRoster,
  mongoDatesStore,
  mongoRosterStore,
  liveDatesFetcher,
  liveRosterFetcher,
} from "@/lib/election-cache";
import { getStateInfo } from "@/lib/states";
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
  const [datesResult, senateResult] = await Promise.allSettled([
    loadElectionDates(state, cycle, mongoDatesStore, liveDatesFetcher),
    loadRoster(
      { state, office: "S", district: "", cycle },
      cycle,
      mongoRosterStore,
      liveRosterFetcher
    ),
  ]);
  const dates = datesResult.status === "fulfilled" ? datesResult.value : [];
  const senateCount = senateResult.status === "fulfilled" ? senateResult.value.length : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <header>
        <p className="text-cream/70 text-xs uppercase tracking-widest mb-2">
          <Link href="/elections" className="hover:text-cream">Elections</Link>
          <span className="mx-2">/</span>Federal research
        </p>
        <h1 className="font-brand text-3xl sm:text-4xl text-gradient">{info.name}</h1>
        <p className="text-cream/75 text-sm mt-2 max-w-2xl leading-relaxed">
          Explore federal candidate records and campaign finance for the {cycle - 1}–{cycle} cycle.
          These FEC records do not confirm who will appear on your ballot and do
          not include state or local contests.
        </p>
        <Link href="/elections" className="inline-block text-gold text-sm mt-3 hover:underline">
          Find official ballot information →
        </Link>
      </header>

      <UpcomingElectionsCalendar
        dates={dates}
        unavailable={datesResult.status === "rejected"}
        title={`Federal dates listed for ${info.name}`}
        subtitle="Statewide dates from the FEC. A date may not apply to your address or primary eligibility; confirm with your election office."
      />

      <section>
        <h2 className="font-brand text-xl text-cream mb-3">U.S. Senate research</h2>
        <Link href={`/elections/${state}/senate`} className="block">
          <GlassCard hover>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-brand text-lg text-cream">{info.name} Senate candidate records</h3>
                <p className="text-cream/75 text-sm mt-2">
                  {senateCount === null
                    ? "FEC candidate information is temporarily unavailable. Open the research page to try again."
                    : senateCount === 0
                      ? "No candidate records were returned for this search. That does not establish whether a Senate election will be held."
                      : `${senateCount} candidate record${senateCount === 1 ? "" : "s"} returned by the FEC. Filing does not establish ballot qualification.`}
                </p>
                <p className="text-gold text-sm mt-3">Explore candidates and campaign finance →</p>
              </div>
              <ChevronRight className="h-5 w-5 text-cream/65 shrink-0 mt-1" />
            </div>
          </GlassCard>
        </Link>
      </section>

      {info.houseDistricts > 0 && (
        <section>
          <h2 className="font-brand text-xl text-cream">
            U.S. House — {info.houseDistricts} district{info.houseDistricts === 1 ? "" : "s"}
          </h2>
          <p className="text-cream/75 text-sm mt-2 mb-4 leading-relaxed">
            Choose a district to research FEC candidate records and campaign finance.
            {info.houseDistricts === 1 && ` ${info.name} has one at-large House seat.`}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: info.houseDistricts }, (_, i) => i + 1).map((n) => {
              const padded = String(n).padStart(2, "0");
              return (
                <Link
                  key={padded}
                  href={`/elections/${state}/house/${padded}`}
                  className="rounded-md border border-glass-border bg-glass-bg px-3 py-3 text-sm text-cream/85 hover:text-cream hover:border-gold/50 transition-colors text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  {info.houseDistricts === 1 ? "At-large district" : `District ${n}`} <span className="text-cream/60">{state}-{padded}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
      {info.houseDistricts === 0 && (
        <p className="text-cream/75 text-sm">
          House delegate research is not available here yet. Use your official
          election office for the contests on your ballot.
        </p>
      )}
    </div>
  );
}
