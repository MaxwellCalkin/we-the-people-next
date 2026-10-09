"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { RollCallResult } from "@/lib/congress";
import PartyBadge from "@/components/ui/PartyBadge";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { VoteBadge } from "@/components/ui/Badge";
import { partyInfo, voteShares } from "@/lib/format";

interface RollCallTableProps {
  rollCall: RollCallResult;
}

type VoteFilter = "all" | "Yea" | "Nay" | "Not Voting" | "Present";

export default function RollCallTable({ rollCall }: RollCallTableProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<VoteFilter>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(
    () => ({
      Yea: rollCall.votes.filter((v) => v.vote === "Yea").length,
      Nay: rollCall.votes.filter((v) => v.vote === "Nay").length,
      "Not Voting": rollCall.votes.filter((v) => v.vote === "Not Voting").length,
      Present: rollCall.votes.filter((v) => v.vote === "Present").length,
    }),
    [rollCall.votes]
  );

  const q = search.trim().toLowerCase();
  const filtered = rollCall.votes
    .filter((v) => filter === "all" || v.vote === filter)
    .filter((v) => !q || v.name.toLowerCase().includes(q) || v.state.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));

  const options = (
    [
      { value: "all", label: `All (${rollCall.votes.length})` },
      { value: "Yea", label: `Yea (${counts.Yea})` },
      { value: "Nay", label: `Nay (${counts.Nay})` },
      { value: "Not Voting", label: `Not voting (${counts["Not Voting"]})` },
      { value: "Present", label: `Present (${counts.Present})` },
    ] as { value: VoteFilter; label: string }[]
  ).filter((o) => o.value === "all" || counts[o.value as Exclude<VoteFilter, "all">] > 0);

  const { yea, nay } = voteShares(counts.Yea, counts.Nay);

  return (
    <section className="card p-5 sm:p-6" aria-label={`${rollCall.chamber} roll call`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">{rollCall.chamber} Vote</h2>
          <p className="mt-0.5 text-sm text-ink-2">
            {rollCall.question}
            {rollCall.date ? ` — ${rollCall.date}` : ""}
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums">
          <span aria-hidden="true">
            <span className="text-yea">{counts.Yea}</span>
            <span className="mx-1.5 text-ink-3">–</span>
            <span className="text-nay">{counts.Nay}</span>
          </span>
          <span className="sr-only">
            {counts.Yea} Yea, {counts.Nay} Nay
          </span>
        </p>
      </div>

      {counts.Yea + counts.Nay > 0 && (
        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
          <div className="bg-yea" style={{ width: `${yea}%` }} />
          <div className="bg-nay" style={{ width: `${nay}%` }} />
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl
          label="Filter by vote"
          options={options}
          value={filter}
          onChange={setFilter}
          size="sm"
          className="max-w-full overflow-x-auto"
        />
        <div className="relative w-full lg:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by name or state…"
            aria-label="Search members"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field h-9 pl-9 text-sm"
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium text-ink-3">
              <th scope="col" className="pb-2.5 pr-4 font-medium">Member</th>
              <th scope="col" className="pb-2.5 pr-4 font-medium">Party</th>
              <th scope="col" className="pb-2.5 pr-4 font-medium">State</th>
              <th scope="col" className="pb-2.5 text-right font-medium">Vote</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((member, i) => (
              <tr
                key={`${member.bioguideId ?? member.name}-${i}`}
                className={`border-b border-line/60 last:border-0${
                  member.bioguideId ? " cursor-pointer transition-colors hover:bg-white/[0.03]" : ""
                }`}
                onClick={
                  member.bioguideId
                    ? (e) => {
                        if ((e.target as HTMLElement).closest("a")) return;
                        router.push(`/members/${member.bioguideId}`);
                      }
                    : undefined
                }
              >
                <td className="py-2.5 pr-4">
                  {member.bioguideId ? (
                    <Link href={`/members/${member.bioguideId}`} className="font-medium text-ink hover:text-gold-bright">
                      {member.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink">{member.name}</span>
                  )}
                </td>
                <td className="py-2.5 pr-4">
                  <PartyBadge party={member.party} />
                  {!partyInfo(member.party).code && <span className="text-ink-3">—</span>}
                </td>
                <td className="py-2.5 pr-4 text-ink-2">{member.state}</td>
                <td className="py-2.5 text-right">
                  <VoteBadge vote={member.vote} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-ink-3">No members match the current filter.</p>
      )}
    </section>
  );
}
