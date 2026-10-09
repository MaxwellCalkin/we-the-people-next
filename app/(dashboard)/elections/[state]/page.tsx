export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight, Landmark } from "lucide-react";
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
import UpcomingElectionsCalendar from "@/components/features/UpcomingElectionsCalendar";
import PageHeader, { SectionHeading } from "@/components/ui/PageHeader";

interface StatePageProps {
  params: Promise<{ state: string }>;
}

export async function generateMetadata({ params }: StatePageProps): Promise<Metadata> {
  const { state } = await params;
  const info = getStateInfo(state);
  return { title: info ? `${info.name} federal races` : "Elections" };
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
    loadRoster({ state, office: "S", district: "", cycle }, cycle, mongoRosterStore, liveRosterFetcher),
  ]);
  const dates = datesResult.status === "fulfilled" ? datesResult.value : [];
  const senateCount = senateResult.status === "fulfilled" ? senateResult.value.length : null;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6 lg:px-8">
      <PageHeader
        breadcrumbs={[{ label: "Elections", href: "/elections" }, { label: info.name }]}
        eyebrow="Federal research"
        title={info.name}
        description={
          <>
            Explore federal candidate records and campaign finance for the {cycle - 1}–{cycle} cycle. These FEC records
            don&apos;t confirm who will appear on your ballot and don&apos;t include state or local contests.{" "}
            <Link href="/elections" className="font-medium text-gold-bright underline-offset-2 hover:underline">
              Look up your ballot
            </Link>
          </>
        }
      />

      <UpcomingElectionsCalendar
        dates={dates}
        unavailable={datesResult.status === "rejected"}
        title={`Federal dates listed for ${info.name}`}
        subtitle="Statewide dates from the FEC. A date may not apply to your address or primary eligibility; confirm with your election office."
      />

      <section aria-labelledby="senate-heading">
        <SectionHeading id="senate-heading" title="U.S. Senate" />
        <div className="card card-interactive group flex items-start gap-4 p-5">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-bright ring-1 ring-gold/25">
            <Landmark className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <Link href={`/elections/${state}/senate`} className="stretched-link font-semibold text-ink">
              {info.name} Senate candidate records
            </Link>
            <p className="mt-1 text-sm text-ink-2">
              {senateCount === null
                ? "FEC candidate information is temporarily unavailable. Open the research page to try again."
                : senateCount === 0
                  ? "No candidate records were returned. That doesn't establish whether a Senate election will be held."
                  : `${senateCount} candidate record${senateCount === 1 ? "" : "s"} from the FEC. Filing doesn't establish ballot qualification.`}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-bright">
              Explore candidates and campaign finance
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </section>

      {info.houseDistricts > 0 ? (
        <section aria-labelledby="house-heading">
          <SectionHeading
            id="house-heading"
            title={`U.S. House · ${info.houseDistricts} district${info.houseDistricts === 1 ? "" : "s"}`}
            description={
              info.houseDistricts === 1
                ? `${info.name} has one at-large House seat.`
                : "Choose a district to research FEC candidate records and campaign finance."
            }
          />
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: info.houseDistricts }, (_, i) => i + 1).map((n) => {
              const padded = String(n).padStart(2, "0");
              return (
                <li key={padded}>
                  <Link
                    href={`/elections/${state}/house/${padded}`}
                    className="group flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-3 text-sm transition-colors hover:border-gold/50"
                  >
                    <span>
                      <span className="block font-medium text-ink">
                        {info.houseDistricts === 1 ? "At-large" : `District ${n}`}
                      </span>
                      <span className="text-xs text-ink-3">
                        {state}-{padded}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-ink-3 group-hover:text-ink" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-line-strong px-5 py-6 text-sm text-ink-2">
          House delegate research isn&apos;t available here yet. Use your official election office for the contests on your
          ballot.
        </p>
      )}
    </div>
  );
}
