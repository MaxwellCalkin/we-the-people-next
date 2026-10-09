import type { Metadata } from "next";
import { Search, SearchX } from "lucide-react";
import { searchBills } from "@/lib/congress";
import { getUserVotes } from "@/lib/viewer";
import BillsInfiniteList from "@/components/features/BillsInfiniteList";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import SearchBar from "@/components/ui/SearchBar";
import { ButtonLink } from "@/components/ui/Button";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `“${q}” · Bill search` : "Search bills" };
}

export default async function BillSearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = (q || "").trim();

  const [bills, userVotes] = await Promise.all([
    query
      ? searchBills(query).catch((err) => {
          console.error("Bill search failed:", err instanceof Error ? err.message : err);
          return null;
        })
      : Promise.resolve([]),
    getUserVotes(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        breadcrumbs={[{ label: "Bills", href: "/bills" }, { label: "Search" }]}
        title={query ? <>Results for &ldquo;{query}&rdquo;</> : "Search bills"}
        description={
          query && bills && bills.length > 0
            ? "Bills in the current Congress, most recently active first."
            : "Search bill titles and topics in the current Congress."
        }
      />

      <SearchBar key={query} className="mb-8 max-w-xl" defaultValue={query} autoFocus={!query} />

      {!query ? (
        <EmptyState
          icon={Search}
          title="What are you looking for?"
          description="Try a topic like “insulin”, “broadband”, or “veterans”, or a bill number like “H.R. 725”."
        />
      ) : bills === null ? (
        <EmptyState
          icon={SearchX}
          title="Search is unavailable right now"
          description="Our bill search provider didn't respond. Please try again in a few minutes."
          action={<ButtonLink href="/bills" variant="secondary">Browse all bills</ButtonLink>}
        />
      ) : bills.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={`No bills match “${query}”`}
          description="Check the spelling, try a broader term, or browse the newest bills instead."
          action={<ButtonLink href="/bills?tab=new" variant="secondary">Browse newest bills</ButtonLink>}
        />
      ) : (
        <BillsInfiniteList initialBills={bills} userVotes={userVotes} search={query} />
      )}
    </div>
  );
}
