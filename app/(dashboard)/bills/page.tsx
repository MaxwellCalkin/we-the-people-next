export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { searchBills } from "@/lib/congress";
import { getTrendingBills } from "@/lib/trending";
import { getUserVotes } from "@/lib/viewer";
import { initialBillsTab } from "@/lib/bills-tab";
import BillsPageTabs from "@/components/features/BillsPageTabs";
import PageHeader from "@/components/ui/PageHeader";
import SearchBar from "@/components/ui/SearchBar";

export const metadata: Metadata = { title: "Bills" };

export default async function BillsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;

  const [newBills, trendingBills, userVotes] = await Promise.all([
    searchBills(null).catch((err) => {
      console.error("Failed to load new bills:", err instanceof Error ? err.message : err);
      return [];
    }),
    getTrendingBills(50).catch((err) => {
      console.error("Failed to load trending bills:", err instanceof Error ? err.message : err);
      return [];
    }),
    getUserVotes(),
  ]);

  const initialTab = initialBillsTab(tab, trendingBills.length);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Legislation"
        title="Bills in Congress"
        description="Read what's moving through Congress and cast your own vote. We'll compare it with how your senators and representative vote."
        actions={<SearchBar className="w-full sm:w-72 lg:hidden" />}
      />
      <BillsPageTabs
        initialTab={initialTab}
        initialNewBills={newBills}
        trendingBills={trendingBills}
        userVotes={userVotes}
      />
    </div>
  );
}
