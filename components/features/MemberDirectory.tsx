// components/features/MemberDirectory.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import MemberCard from "./MemberCard";

interface MemberData {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district: number | null;
  chamber: string;
  communityScore: number | null;
  matchingVotes: number;
  totalCompared: number;
}

interface MemberDirectoryProps {
  members: MemberData[];
}

type SortOption = "alignment" | "name" | "state";

export default function MemberDirectory({ members }: MemberDirectoryProps) {
  const [search, setSearch] = useState("");
  const [chamber, setChamber] = useState<"All" | "House" | "Senate">("All");
  const [stateFilter, setStateFilter] = useState("All");
  const [partyFilter, setPartyFilter] = useState("All");
  const [sort, setSort] = useState<SortOption>("alignment");

  const states = useMemo(() => {
    const s = [...new Set(members.map((m) => m.state))].sort();
    return ["All", ...s];
  }, [members]);

  const parties = useMemo(() => {
    const p = [...new Set(members.map((m) => m.party))].sort();
    return ["All", ...p];
  }, [members]);

  const filtered = useMemo(() => {
    let result = members;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }
    if (chamber !== "All") {
      result = result.filter((m) => m.chamber === chamber);
    }
    if (stateFilter !== "All") {
      result = result.filter((m) => m.state === stateFilter);
    }
    if (partyFilter !== "All") {
      result = result.filter((m) => m.party === partyFilter);
    }

    result = [...result].sort((a, b) => {
      if (sort === "alignment") {
        if (a.communityScore === null && b.communityScore === null) return 0;
        if (a.communityScore === null) return 1;
        if (b.communityScore === null) return -1;
        return b.communityScore - a.communityScore;
      }
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "state") return a.state.localeCompare(b.state) || a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [members, search, chamber, stateFilter, partyFilter, sort]);

  const ranked = filtered.map((m, i) => ({
    ...m,
    rank: sort === "alignment" && m.communityScore !== null ? i + 1 : null,
  }));

  const selectClass =
    "bg-glass-bg border border-glass-border rounded-lg px-3 py-2 text-sm text-cream/70 focus:outline-none focus:border-gold/40";

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-glass-bg border border-glass-border rounded-lg px-3 py-2 text-sm text-cream placeholder:text-cream/40 focus:outline-none focus:border-gold/40"
        />
        <select
          value={chamber}
          onChange={(e) => setChamber(e.target.value as "All" | "House" | "Senate")}
          className={selectClass}
        >
          <option value="All">All Chambers</option>
          <option value="House">House</option>
          <option value="Senate">Senate</option>
        </select>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className={selectClass}
        >
          {states.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "All States" : s}
            </option>
          ))}
        </select>
        <select
          value={partyFilter}
          onChange={(e) => setPartyFilter(e.target.value)}
          className={selectClass}
        >
          {parties.map((p) => (
            <option key={p} value={p}>
              {p === "All" ? "All Parties" : p}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className={selectClass}
        >
          <option value="alignment">Sort: Alignment</option>
          <option value="name">Sort: Name A-Z</option>
          <option value="state">Sort: State</option>
        </select>
      </div>

      <p className="text-cream/40 text-sm mb-4">
        {filtered.length} member{filtered.length !== 1 ? "s" : ""}
      </p>

      <div className="space-y-2">
        {ranked.map((m) => (
          <Link key={m.bioguideId} href={`/members/${m.bioguideId}`}>
            <MemberCard
              rank={m.rank}
              bioguideId={m.bioguideId}
              name={m.name}
              party={m.party}
              state={m.state}
              district={m.district}
              chamber={m.chamber}
              communityScore={m.communityScore}
              matchingVotes={m.matchingVotes}
              totalCompared={m.totalCompared}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
