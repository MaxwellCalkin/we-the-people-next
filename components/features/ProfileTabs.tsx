"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Lightbulb, ListChecks, Megaphone } from "lucide-react";
import ProposalCard from "@/components/features/ProposalCard";
import EmptyState from "@/components/ui/EmptyState";
import { VoteBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { TabList, TabPanel } from "@/components/ui/Tabs";
import { formatBillNumber } from "@/lib/format";

interface VoteEntry {
  bill: {
    _id: string;
    title: string;
    billSlug: string;
    congress: string;
  } | null;
  position: "Yea" | "Nay";
}

interface ProposalEntry {
  _id: string;
  title: string;
  image?: string;
  description: string;
  upvoteCount: number;
}

interface ProfileTabsProps {
  votes: VoteEntry[];
  proposals: ProposalEntry[];
}

export default function ProfileTabs({ votes, proposals }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<"votes" | "proposals">("votes");

  return (
    <section aria-label="Your activity">
      <TabList
        label="Your activity"
        prefix="profile"
        value={activeTab}
        onChange={setActiveTab}
        className="mb-6"
        items={[
          { id: "votes", label: "My votes", count: votes.length, icon: <ListChecks className="h-4 w-4" aria-hidden="true" /> },
          { id: "proposals", label: "My proposals", count: proposals.length, icon: <Megaphone className="h-4 w-4" aria-hidden="true" /> },
        ]}
      />

      <TabPanel prefix="profile" active={activeTab}>
        {activeTab === "votes" &&
          (votes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="You haven't voted on any bills yet"
              description="Vote Yea or Nay on a bill and we'll start comparing your choices with your representatives' votes."
              action={<ButtonLink href="/bills">Find a bill to vote on</ButtonLink>}
            />
          ) : (
            <ul className="card divide-y divide-line overflow-hidden">
              {votes.map((v, idx) => (
                <li
                  key={v.bill?._id ?? idx}
                  className="relative flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.025]"
                >
                  <div className="min-w-0 flex-1">
                    {v.bill ? (
                      <>
                        <p className="text-xs font-semibold text-gold-bright">{formatBillNumber(v.bill.billSlug)}</p>
                        <Link
                          href={`/vote/${v.bill.billSlug}/${v.bill.congress}/voted`}
                          className="stretched-link mt-0.5 block font-medium text-ink line-clamp-2"
                        >
                          {v.bill.title}
                        </Link>
                      </>
                    ) : (
                      <span className="text-sm text-ink-3">This bill&apos;s details aren&apos;t available.</span>
                    )}
                  </div>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-ink-3">
                    You voted <VoteBadge vote={v.position} />
                  </span>
                </li>
              ))}
            </ul>
          ))}

        {activeTab === "proposals" &&
          (proposals.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title="You haven't proposed a bill yet"
              description="Got an idea for a law? Write it up and see who in your district and around the country supports it."
              action={<ButtonLink href="/proposals/new">Propose a bill</ButtonLink>}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {proposals.map((proposal) => (
                <li key={proposal._id}>
                  <ProposalCard proposal={proposal} />
                </li>
              ))}
            </ul>
          ))}
      </TabPanel>
    </section>
  );
}
