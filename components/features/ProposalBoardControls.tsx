"use client";
// components/features/ProposalBoardControls.tsx
//
// Client control bar for the proposals board. Drives scope (Global / State /
// District) and sort (Top / New) by pushing query params onto the URL; the
// server board page re-reads searchParams and re-queries. Browse-friendly:
// every state/district is selectable regardless of the viewer's own location.

import { useRouter, useSearchParams } from "next/navigation";
import { Flame, Clock } from "lucide-react";
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

export default function ProposalBoardControls({
  scope,
  sort,
  state,
  district,
}: ProposalBoardControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Merge the given changes into the current query string and navigate. Keys
  // set to undefined are removed so the URL stays clean.
  const update = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `/proposals?${qs}` : "/proposals");
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

  const scopeBtn = (value: Scope) =>
    `px-3 py-1.5 text-sm transition-colors ${
      scope === value ? "bg-gold/15 text-gold" : "text-cream/60 hover:text-cream"
    }`;

  const sortBtn = (value: Sort) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
      sort === value ? "bg-gold/15 text-gold" : "text-cream/60 hover:text-cream"
    }`;

  const selectClass =
    "bg-white/5 border border-glass-border rounded-lg px-3 py-1.5 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-gold/50";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Scope */}
      <div className="inline-flex rounded-lg border border-glass-border overflow-hidden">
        <button onClick={() => onScope("global")} className={scopeBtn("global")}>
          Global
        </button>
        <button onClick={() => onScope("state")} className={scopeBtn("state")}>
          By State
        </button>
        <button onClick={() => onScope("district")} className={scopeBtn("district")}>
          By District
        </button>
      </div>

      {/* State selector (shown for state + district scopes) */}
      {(scope === "state" || scope === "district") && (
        <select
          aria-label="State"
          value={selectState}
          onChange={(e) => onStateChange(e.target.value)}
          className={selectClass}
        >
          {STATES.map((s) => (
            <option key={s.code} value={s.code} className="bg-navy text-cream">
              {s.code} — {s.name}
            </option>
          ))}
        </select>
      )}

      {/* District selector (district scope only) */}
      {scope === "district" && (
        <select
          aria-label="District"
          value={district || districtOptions(selectState)[0]?.value || "00"}
          onChange={(e) => update({ district: e.target.value })}
          className={selectClass}
        >
          {districtOptions(selectState).map((d) => (
            <option key={d.value} value={d.value} className="bg-navy text-cream">
              {d.label}
            </option>
          ))}
        </select>
      )}

      {/* Sort */}
      <div className="inline-flex rounded-lg border border-glass-border overflow-hidden ml-auto">
        <button onClick={() => update({ sort: "top" })} className={sortBtn("top")}>
          <Flame className="h-4 w-4" /> Top
        </button>
        <button onClick={() => update({ sort: "new" })} className={sortBtn("new")}>
          <Clock className="h-4 w-4" /> New
        </button>
      </div>
    </div>
  );
}
