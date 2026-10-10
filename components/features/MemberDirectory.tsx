// components/features/MemberDirectory.tsx
"use client";

import { useMemo, useState } from "react";
import { Search, UserX } from "lucide-react";
import MemberCard from "./MemberCard";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { displayName, partyInfo } from "@/lib/format";

interface MemberData {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district: number | null;
  chamber: string;
  imageUrl?: string;
  communityScore: number | null;
  matchingVotes: number;
  totalCompared: number;
}

interface MemberDirectoryProps {
  members: MemberData[];
}

type SortOption = "alignment" | "name" | "state";
type Chamber = "All" | "House" | "Senate";

const PAGE = 50;

export default function MemberDirectory({ members }: MemberDirectoryProps) {
  const [search, setSearch] = useState("");
  const [chamber, setChamber] = useState<Chamber>("All");
  const [stateFilter, setStateFilter] = useState("All");
  const [partyFilter, setPartyFilter] = useState("All");
  const [sort, setSort] = useState<SortOption>("alignment");
  const [visible, setVisible] = useState(PAGE);

  const states = useMemo(() => [...new Set(members.map((m) => m.state))].sort(), [members]);
  const parties = useMemo(() => [...new Set(members.map((m) => m.party).filter(Boolean))].sort(), [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = members.filter(
      (m) =>
        (!q || m.name.toLowerCase().includes(q) || displayName(m.name).toLowerCase().includes(q)) &&
        (chamber === "All" || m.chamber === chamber) &&
        (stateFilter === "All" || m.state === stateFilter) &&
        (partyFilter === "All" || m.party === partyFilter)
    );

    return [...result].sort((a, b) => {
      if (sort === "alignment") {
        // Unscored members follow in last-name order (names are "Last, First").
        if (a.communityScore === null && b.communityScore === null) return a.name.localeCompare(b.name);
        if (a.communityScore === null) return 1;
        if (b.communityScore === null) return -1;
        // Same score: the larger sample of shared votes ranks higher.
        return b.communityScore - a.communityScore || b.totalCompared - a.totalCompared;
      }
      if (sort === "name") return a.name.localeCompare(b.name);
      return a.state.localeCompare(b.state) || a.name.localeCompare(b.name);
    });
  }, [members, search, chamber, stateFilter, partyFilter, sort]);

  const filtersActive = search !== "" || chamber !== "All" || stateFilter !== "All" || partyFilter !== "All";
  const resetFilters = () => {
    setSearch("");
    setChamber("All");
    setStateFilter("All");
    setPartyFilter("All");
    setVisible(PAGE);
  };

  // Show the first page again whenever the filters change.
  const filterKey = `${search}|${chamber}|${stateFilter}|${partyFilter}|${sort}`;
  const [lastKey, setLastKey] = useState(filterKey);
  if (filterKey !== lastKey) {
    setLastKey(filterKey);
    setVisible(PAGE);
  }

  return (
    <div>
      <div className="card mb-5 grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(10rem,0.9fr)] lg:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by name…"
            aria-label="Search members by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field h-10 pl-9"
          />
        </div>
        <SegmentedControl
          label="Chamber"
          value={chamber}
          onChange={setChamber}
          options={[
            { value: "All", label: "All" },
            { value: "House", label: "House" },
            { value: "Senate", label: "Senate" },
          ]}
        />
        <select aria-label="State" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="field h-10 text-sm">
          <option value="All">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select aria-label="Party" value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} className="field h-10 text-sm">
          <option value="All">All parties</option>
          {parties.map((p) => (
            <option key={p} value={p}>
              {partyInfo(p).label}
            </option>
          ))}
        </select>
        <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="field h-10 text-sm">
          <option value="alignment">Sort: Alignment</option>
          <option value="name">Sort: Last name</option>
          <option value="state">Sort: State</option>
        </select>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-3" aria-live="polite">
          {filtered.length === members.length
            ? `${members.length.toLocaleString("en-US")} members`
            : `${filtered.length.toLocaleString("en-US")} of ${members.length.toLocaleString("en-US")} members`}
        </p>
        {filtersActive && (
          <button type="button" onClick={resetFilters} className="text-sm font-medium text-gold-bright hover:text-gold">
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          compact
          icon={UserX}
          title="No members match those filters"
          description="Try a different name or widen the chamber, state, or party filters."
          action={
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-2">
            {filtered.slice(0, visible).map((m, i) => (
              <li key={m.bioguideId}>
                <MemberCard
                  rank={sort === "alignment" && m.communityScore !== null ? i + 1 : null}
                  bioguideId={m.bioguideId}
                  name={m.name}
                  party={m.party}
                  state={m.state}
                  district={m.district}
                  chamber={m.chamber}
                  imageUrl={m.imageUrl}
                  communityScore={m.communityScore}
                  matchingVotes={m.matchingVotes}
                  totalCompared={m.totalCompared}
                />
              </li>
            ))}
          </ul>
          {visible < filtered.length && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE)}>
                Show more members
              </Button>
              <p className="text-xs text-ink-3">
                Showing {visible} of {filtered.length}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
