"use client";

import { useState } from "react";
import type { RollCallResult } from "@/lib/congress";

interface RollCallTableProps {
  rollCall: RollCallResult;
}

type VoteFilter = "all" | "Yea" | "Nay" | "Not Voting" | "Present";

const PARTY_LABELS: Record<string, string> = {
  D: "Democrat",
  R: "Republican",
  I: "Independent",
  ID: "Independent",
};

function voteColor(vote: string): string {
  switch (vote) {
    case "Yea":
      return "text-emerald-400";
    case "Nay":
      return "text-red-400";
    case "Not Voting":
      return "text-cream/40";
    case "Present":
      return "text-gold";
    default:
      return "text-cream/50";
  }
}

function filterBadgeColor(filter: VoteFilter, active: boolean): string {
  if (!active) return "bg-white/5 text-cream/50 hover:bg-white/10";
  switch (filter) {
    case "Yea":
      return "bg-emerald-400/20 text-emerald-400 ring-1 ring-emerald-400/30";
    case "Nay":
      return "bg-red-400/20 text-red-400 ring-1 ring-red-400/30";
    case "Not Voting":
      return "bg-white/10 text-cream/60 ring-1 ring-cream/20";
    case "Present":
      return "bg-gold/20 text-gold ring-1 ring-gold/30";
    default:
      return "bg-white/10 text-cream ring-1 ring-cream/20";
  }
}

export default function RollCallTable({ rollCall }: RollCallTableProps) {
  const [filter, setFilter] = useState<VoteFilter>("all");
  const [search, setSearch] = useState("");

  const counts = {
    Yea: rollCall.votes.filter((v) => v.vote === "Yea").length,
    Nay: rollCall.votes.filter((v) => v.vote === "Nay").length,
    "Not Voting": rollCall.votes.filter((v) => v.vote === "Not Voting").length,
    Present: rollCall.votes.filter((v) => v.vote === "Present").length,
  };

  const filtered = rollCall.votes
    .filter((v) => filter === "all" || v.vote === filter)
    .filter(
      (v) =>
        !search ||
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.state.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const filters: { label: string; value: VoteFilter; count?: number }[] = [
    { label: "All", value: "all" },
    { label: "Yea", value: "Yea", count: counts.Yea },
    { label: "Nay", value: "Nay", count: counts.Nay },
    { label: "Not Voting", value: "Not Voting", count: counts["Not Voting"] },
    { label: "Present", value: "Present", count: counts.Present },
  ];

  return (
    <div className="glass-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="font-brand text-xl text-cream">
            {rollCall.chamber} Vote
          </h2>
          <p className="text-cream/50 text-sm">
            {rollCall.question}
            {rollCall.date ? ` — ${rollCall.date}` : ""}
          </p>
        </div>
        <div className="text-sm text-cream/60">
          <span className="text-emerald-400 font-semibold">{counts.Yea}</span>
          {" - "}
          <span className="text-red-400 font-semibold">{counts.Nay}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters
          .filter((f) => f.value === "all" || (f.count && f.count > 0))
          .map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterBadgeColor(f.value, filter === f.value)}`}
            >
              {f.label}
              {f.count !== undefined ? ` (${f.count})` : ""}
            </button>
          ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or state..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:w-64 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-cream text-sm placeholder:text-cream/30 focus:outline-none focus:ring-1 focus:ring-gold/50"
      />

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-cream/50 text-left">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Party</th>
              <th className="pb-2 pr-4 font-medium">State</th>
              <th className="pb-2 font-medium text-right">Vote</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((member, i) => (
              <tr
                key={i}
                className="border-b border-white/5 last:border-0"
              >
                <td className="py-2 pr-4 text-cream">{member.name}</td>
                <td className="py-2 pr-4 text-cream/60">
                  {PARTY_LABELS[member.party] || member.party}
                </td>
                <td className="py-2 pr-4 text-cream/60">{member.state}</td>
                <td
                  className={`py-2 text-right font-semibold ${voteColor(member.vote)}`}
                >
                  {member.vote}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-cream/40 text-sm py-4">
          No members match the current filter.
        </p>
      )}
    </div>
  );
}
