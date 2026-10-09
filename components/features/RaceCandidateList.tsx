// components/features/RaceCandidateList.tsx
//
// FEC research records, ordered alphabetically rather than by fundraising.
// These records do not establish ballot qualification or official ballot order.

import { UserSearch } from "lucide-react";
import CandidateCard from "./CandidateCard";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import type { CandidateTotals } from "@/lib/fec";
import type { IRosterCandidate } from "@/models/ElectionRosterCache";

export interface RaceCandidate {
  candidate: IRosterCandidate;
  totals: CandidateTotals | null;
}

interface RaceCandidateListProps {
  candidates: RaceCandidate[];
  emptyMessage?: string;
  unavailable?: boolean;
}

export default function RaceCandidateList({
  candidates,
  emptyMessage = "No candidate records were returned by the FEC for this search. This does not confirm who will appear on the ballot.",
  unavailable = false,
}: RaceCandidateListProps) {
  if (unavailable) {
    return (
      <Alert tone="warning" title="Candidate information is temporarily unavailable.">
        Please try again later, or check your election office&apos;s official sample ballot.
      </Alert>
    );
  }
  if (candidates.length === 0) {
    return <EmptyState compact icon={UserSearch} title="No candidate records" description={emptyMessage} />;
  }

  const sorted = [...candidates].sort((a, b) => a.candidate.name.localeCompare(b.candidate.name));

  return (
    <section aria-labelledby="candidates-heading">
      <h2 id="candidates-heading" className="text-lg font-semibold text-ink">
        Candidates who filed with the FEC
      </h2>
      <p className="mt-1 mb-4 text-sm leading-relaxed text-ink-3">
        Listed alphabetically. Filing and fundraising records don&apos;t confirm who qualifies for the ballot, and the
        official ballot order may differ.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {sorted.map((c) => (
          <li key={c.candidate.fecId}>
            <CandidateCard candidate={c.candidate} totals={c.totals} />
          </li>
        ))}
      </ul>
    </section>
  );
}
