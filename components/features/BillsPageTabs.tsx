"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, FileText, Flame, Trophy } from "lucide-react";
import TrendingBillsList from "./TrendingBillsList";
import TopBillsList from "./TopBillsList";
import BillsInfiniteList from "./BillsInfiniteList";
import EmptyState from "@/components/ui/EmptyState";
import { TabList, TabPanel } from "@/components/ui/Tabs";
import type { BillResult } from "@/types";
import type { TrendingBill } from "@/lib/trending";

import type { BillsTab } from "@/lib/bills-tab";

interface BillsPageTabsProps {
  initialTab: BillsTab;
  initialNewBills: BillResult[];
  trendingBills: TrendingBill[];
  userVotes: Record<string, "Yea" | "Nay">;
}

export default function BillsPageTabs({ initialTab, initialNewBills, trendingBills, userVotes }: BillsPageTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<BillsTab>(initialTab);

  const selectTab = (tab: BillsTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/bills?${params}`, { scroll: false });
  };

  return (
    <div>
      <TabList
        label="Bill lists"
        prefix="bills"
        value={activeTab}
        onChange={selectTab}
        className="mb-6"
        items={[
          { id: "trending", label: "Trending", icon: <Flame className="h-4 w-4" aria-hidden="true" /> },
          { id: "top", label: "Most voted", icon: <Trophy className="h-4 w-4" aria-hidden="true" /> },
          { id: "new", label: "Newest", icon: <Clock className="h-4 w-4" aria-hidden="true" /> },
        ]}
      />

      <TabPanel prefix="bills" active={activeTab}>
        {activeTab === "trending" && (
          <TrendingBillsList bills={trendingBills} userVotes={userVotes} onBrowseNew={() => selectTab("new")} />
        )}
        {activeTab === "top" && <TopBillsList userVotes={userVotes} />}
        {activeTab === "new" &&
          (initialNewBills.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="We couldn't load new bills right now"
              description="Congress.gov may be temporarily unavailable. Please check back in a few minutes."
            />
          ) : (
            <BillsInfiniteList initialBills={initialNewBills} userVotes={userVotes} />
          ))}
      </TabPanel>
    </div>
  );
}
