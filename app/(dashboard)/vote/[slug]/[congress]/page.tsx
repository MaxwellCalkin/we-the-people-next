import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import { fetchBillDetails } from "@/lib/congress";
import User from "@/models/User";
import GlassCard from "@/components/ui/GlassCard";
import VoteForm from "@/components/features/VoteForm";
import { ExternalLink } from "lucide-react";

interface VotePageProps {
  params: Promise<{ slug: string; congress: string }>;
}

export default async function VotePage({ params }: VotePageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  await connectDB();
  const { slug, congress } = await params;

  // Check if user already voted
  const user = await User.findById(session.user.id).lean();
  if (user) {
    const allVoted = [
      ...(user.yeaBillSlugs || []),
      ...(user.nayBillSlugs || []),
    ];
    if (allVoted.includes(slug)) {
      redirect(`/vote/${slug}/${congress}/voted`);
    }
  }

  const bill = await fetchBillDetails(congress, slug);
  if (!bill) redirect("/bills");

  // Build govtrack URL
  const govtrackUrl = `https://www.govtrack.us/congress/bills/${congress}/${bill.bill_slug}`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <GlassCard>
        <h1 className="font-brand text-2xl sm:text-3xl text-gradient mb-4">
          {bill.short_title || bill.title}
        </h1>

        {bill.summary && (
          <p className="text-cream/70 text-sm leading-relaxed mb-6">
            {bill.summary}
          </p>
        )}

        {bill.sponsor && (
          <p className="text-cream/50 text-xs mb-2">
            Sponsor: {bill.sponsor}
          </p>
        )}

        {bill.latest_major_action && (
          <p className="text-cream/50 text-xs mb-4">
            Latest Action: {bill.latest_major_action}
          </p>
        )}

        <a
          href={govtrackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-gold text-sm hover:text-gold/80 transition-colors mb-8"
        >
          View on GovTrack <ExternalLink className="h-3.5 w-3.5" />
        </a>

        <div className="border-t border-glass-border pt-6">
          <h2 className="font-brand text-xl text-cream mb-4">
            Cast Your Vote
          </h2>
          <VoteForm
            billSlug={bill.bill_slug}
            congress={bill.congress}
            title={bill.short_title || bill.title}
            summary={bill.summary || ""}
          />
        </div>
      </GlassCard>
    </div>
  );
}
