"use client";
// components/features/ProposalBoardControls.tsx
//
// Client control bar for the proposals board. Drives scope (Global / State /
// District) and sort (Top / New) by pushing query params onto the URL; the
// server board page re-reads searchParams and re-queries. Browse-friendly:
// every state/district is selectable regardless of the viewer's own location.

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Flame, Loader2 } from "lucide-react";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { STATES, getStateInfo } from "@/lib/states";

type Scope = "global" | "state" | "district";
type Sort = "top" | "new";

interface ProposalBoardControlsProps {
  scope: Scope;
  sort: Sort;
  state: string;
  district: string;
}

// Build the district option list for a state. House district counts come from
// lib/states; at-large states (1 district) expose a single "At-large" option
// stored as "00" to match the upvote bucket / authorDistrict convention.
function districtOptions(stateCode: string): { value: string; label: string }[] {
  const info = getStateInfo(stateCode);
  const count = info?.houseDistricts ?? 0;
  if (count <= 1) return [{ value: "00", label: "At-large" }];
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1);
    return { value: n, label: `District ${n}` };
  });
}

export default function ProposalBoardControls({ scope, sort, state, district }: ProposalBoardControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Merge the given changes into the current query string and navigate. Keys
  // set to undefined are removed so the URL stays clean.
  const update = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/proposals?${qs}` : "/proposals", { scroll: false }));
  };

  const selectState = state || STATES[0].code;

  const onScope = (next: Scope) => {
    if (next === "global") {
      update({ scope: "global", state: undefined, district: undefined });
    } else if (next === "state") {
      update({ scope: "state", state: selectState, district: undefined });
    } else {
      const firstDistrict = districtOptions(selectState)[0]?.value ?? "00";
      update({ scope: "district", state: selectState, district: firstDistrict });
    }
  };

  const onStateChange = (nextState: string) => {
    if (scope === "district") {
      const firstDistrict = districtOptions(nextState)[0]?.value ?? "00";
      update({ state: nextState, district: firstDistrict });
    } else {
      update({ state: nextState });
    }
  };

  return (
    <div className="card flex flex-wrap items-center gap-3 p-3 sm:p-4">
      <SegmentedControl
        label="Where"
        value={scope}
        onChange={onScope}
        options={[
          { value: "global", label: "Nationwide" },
          { value: "state", label: "By state" },
          { value: "district", label: "By district" },
        ]}
      />

      {(scope === "state" || scope === "district") && (
        <select
          aria-label="State"
          value={selectState}
          onChange={(e) => onStateChange(e.target.value)}
          className="field h-10 w-auto min-w-[11rem] text-sm"
        >
          {STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      )}

      {scope === "district" && (
        <select
          aria-label="District"
          value={district || districtOptions(selectState)[0]?.value || "00"}
          onChange={(e) => update({ district: e.target.value })}
          className="field h-10 w-auto min-w-[9rem] text-sm"
        >
          {districtOptions(selectState).map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      )}

      <div className="ml-auto flex items-center gap-3">
        {pending && (
          <span role="status" className="inline-flex">
            <Loader2 className="h-4 w-4 animate-spin text-ink-3" aria-hidden="true" />
            <span className="sr-only">Updating proposals</span>
          </span>
        )}
        <SegmentedControl
          label="Sort"
          value={sort}
          onChange={(next) => update({ sort: next })}
          options={[
            { value: "top", label: "Top", icon: <Flame className="h-4 w-4" aria-hidden="true" /> },
            { value: "new", label: "New", icon: <Clock className="h-4 w-4" aria-hidden="true" /> },
          ]}
        />
      </div>
    </div>
  );
}
