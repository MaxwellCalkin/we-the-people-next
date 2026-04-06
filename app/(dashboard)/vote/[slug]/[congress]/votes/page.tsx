export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  fetchBillDetails,
  getAllVotesOnBill,
  parseBillSlug,
} from "@/lib/congress";
import { auth } from "@/lib/auth";
import GlassCard from "@/components/ui/GlassCard";
import RollCallTable from "@/components/features/RollCallTable";
import { ArrowLeft } from "lucide-react";

interface VotesPageProps {
  params: Promise<{ slug: string; congress: string }>;
}

export default async function AllVotesPage({ params }: VotesPageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { slug, congress } = await params;
  const bill = await fetchBillDetails(congress, slug);
  if (!bill) redirect("/bills");

  const parsed = parseBillSlug(bill.bill_slug);
  if (!parsed) redirect("/bills");

  const voteData = await getAllVotesOnBill(congress, parsed.type, parsed.number);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link
        href={`/vote/${slug}/${congress}/voted`}
        className="inline-flex items-center gap-1.5 text-gold text-sm hover:text-gold/80 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to bill
      </Link>

      <GlassCard>
        <h1 className="font-brand text-2xl sm:text-3xl text-gradient mb-2">
          {bill.short_title || bill.title}
        </h1>
        <p className="text-cream/60 text-sm">
          Congressional Roll Call Votes
        </p>
      </GlassCard>

      {voteData.type === "special" ? (
        <GlassCard className="text-center py-8">
          <p className="text-cream/70 text-lg">{voteData.status}</p>
          <p className="text-cream/40 text-sm mt-2">
            No individual member vote records are available for this bill.
          </p>
        </GlassCard>
      ) : (
        <>
          {voteData.chamberStatuses?.map((cs, i) => (
            <GlassCard key={`status-${i}`} className="text-center py-6">
              <h2 className="font-brand text-xl text-cream mb-1">
                {cs.chamber}
              </h2>
              <p className="text-cream/60 text-sm">{cs.status}</p>
              <p className="text-cream/40 text-xs mt-1">
                No individual member vote records available.
              </p>
            </GlassCard>
          ))}
          {voteData.results.map((rollCall, i) => (
            <RollCallTable key={i} rollCall={rollCall} />
          ))}
        </>
      )}
    </div>
  );
}
