"use client";

import { useState } from "react";
import TrendingBillsList from "./TrendingBillsList";
import TopBillsList from "./TopBillsList";
import BillsInfiniteList from "./BillsInfiniteList";
import SearchBar from "@/components/ui/SearchBar";
import type { BillResult } from "@/types";

type Tab = "trending" | "top" | "new";

interface BillsPageTabsProps {
  initialNewBills: BillResult[];
  userVotedSlugs: string[];
}

export default function BillsPageTabs({
  initialNewBills,
  userVotedSlugs,
}: BillsPageTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("trending");

  const tabs: { id: Tab; label: string }[] = [
    { id: "trending", label: "Trending" },
    { id: "top", label: "Top" },
    { id: "new", label: "New" },
  ];

  return (
    <div>
      <div className="flex gap-6 mb-6 border-b border-glass-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === tab.id
                ? "text-gold"
                : "text-cream/50 hover:text-cream"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "trending" && (
        <TrendingBillsList userVotedSlugs={userVotedSlugs} />
      )}
      {activeTab === "top" && (
        <TopBillsList userVotedSlugs={userVotedSlugs} />
      )}
      {activeTab === "new" && (
        <div>
          <SearchBar className="max-w-md mb-8" />
          {initialNewBills.length === 0 ? (
            <p className="text-cream/60">No bills available at this time.</p>
          ) : (
            <BillsInfiniteList
              initialBills={initialNewBills}
              userVotedSlugs={userVotedSlugs}
            />
          )}
        </div>
      )}
    </div>
  );
}
