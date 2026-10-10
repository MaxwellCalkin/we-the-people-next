export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { FileQuestion, Gavel } from "lucide-react";
import { fetchBillDetails, getAllVotesOnBill, parseBillSlug } from "@/lib/congress";
import { formatBillNumber } from "@/lib/format";
import { getUserVotes } from "@/lib/viewer";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import BillHeader from "@/components/features/BillHeader";
import RollCallTable from "@/components/features/RollCallTable";

interface VotesPageProps {
  params: Promise<{ slug: string; congress: string }>;
}

export async function generateMetadata({ params }: VotesPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Roll call votes on ${formatBillNumber(slug)}` };
}

function specialStatusCopy(status: string): { title: string; description: string } {
  switch (status) {
    case "Passed by Unanimous Consent":
      return {
        title: "Passed by unanimous consent",
        description: "No member objected, so no individual votes were recorded.",
      };
    case "Passed by Voice Vote":
      return {
        title: "Passed by voice vote",
        description: "Members voted aloud as a group, so individual votes weren't recorded.",
      };
    case "Error fetching votes":
      return {
        title: "We couldn't load the roll call",
        description: "The House and Senate vote records didn't respond. Please try again in a few minutes.",
      };
    default:
      return {
        title: "No roll call votes yet",
        description: "Neither chamber has held a recorded vote on this bill. Check back as it moves through Congress.",
      };
  }
}

export default async function AllVotesPage({ params }: VotesPageProps) {
  const { slug, congress } = await params;
  const [bill, userVotes] = await Promise.all([fetchBillDetails(congress, slug).catch(() => null), getUserVotes()]);
  const parsed = bill ? parseBillSlug(bill.bill_slug) : null;

  if (!bill || !parsed) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <EmptyState
          icon={FileQuestion}
          title="We couldn't load this bill"
          description="Congress.gov may be temporarily unavailable. Please try again in a few minutes."
          action={<ButtonLink href="/bills">Browse bills</ButtonLink>}
        />
      </div>
    );
  }

  const voteData = await getAllVotesOnBill(congress, parsed.type, parsed.number);
  const billLabel = formatBillNumber(bill.bill_slug);
  const billLink = `/vote/${slug}/${congress}${userVotes[slug] ? "/voted" : ""}`;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <BillHeader
        bill={bill}
        showMeta={false}
        breadcrumbs={[
          { label: "Bills", href: "/bills" },
          { label: billLabel, href: billLink },
          { label: "Roll call votes" },
        ]}
      />

      <div className="space-y-6">
        {voteData.type === "special" ? (
          <EmptyState icon={Gavel} {...specialStatusCopy(voteData.status)} />
        ) : (
          <>
            {voteData.chamberStatuses?.map((cs, i) => (
              <Card key={`status-${i}`} className="flex items-start gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-ink-2">
                  <Gavel className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold text-ink">{cs.chamber}</h2>
                  <p className="text-sm text-ink-2">{cs.status}</p>
                  <p className="mt-1 text-xs text-ink-3">No individual member votes were recorded in this chamber.</p>
                </div>
              </Card>
            ))}
            {voteData.results.map((rollCall, i) => (
              <RollCallTable key={i} rollCall={rollCall} />
            ))}
            {voteData.results.length === 0 && (voteData.chamberStatuses?.length ?? 0) === 0 && (
              <EmptyState
                icon={Gavel}
                title="No roll call votes yet"
                description="Neither chamber has held a recorded vote on this bill. Check back as it moves through Congress."
                action={<ButtonLink href={billLink} variant="secondary">Back to {billLabel}</ButtonLink>}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
