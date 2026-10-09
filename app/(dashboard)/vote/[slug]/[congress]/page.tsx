export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileQuestion, Vote } from "lucide-react";
import { auth } from "@/lib/auth";
import { fetchBillDetails } from "@/lib/congress";
import { getUserVotes } from "@/lib/viewer";
import { formatBillNumber } from "@/lib/format";
import { loginHref } from "@/lib/safe-redirect";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import BillHeader, { govtrackUrl } from "@/components/features/BillHeader";
import VoteForm from "@/components/features/VoteForm";
import AiSummaryPrompt from "@/components/features/AiSummaryPrompt";

interface VotePageProps {
  params: Promise<{ slug: string; congress: string }>;
}

export async function generateMetadata({ params }: VotePageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Vote on ${formatBillNumber(slug)}` };
}

export default async function VotePage({ params }: VotePageProps) {
  const { slug, congress } = await params;
  const [session, userVotes] = await Promise.all([auth(), getUserVotes()]);

  if (userVotes[slug]) redirect(`/vote/${slug}/${congress}/voted`);

  const bill = await fetchBillDetails(congress, slug).catch(() => null);
  if (!bill) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <EmptyState
          icon={FileQuestion}
          title="We couldn't find that bill"
          description="It may have a different number, or Congress.gov may be temporarily unavailable."
          action={<ButtonLink href="/bills">Browse bills</ButtonLink>}
        />
      </div>
    );
  }

  const title = bill.short_title || bill.title;
  const returnTo = `/vote/${slug}/${congress}`;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <BillHeader bill={bill} />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card as="section" aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="text-lg font-semibold text-ink">
              Summary
            </h2>
            {bill.summary ? (
              <>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-2">{bill.summary}</p>
                <p className="mt-4 text-xs text-ink-3">Summary by the Congressional Research Service via Congress.gov.</p>
              </>
            ) : (
              <p className="mt-3 leading-relaxed text-ink-2">
                The Congressional Research Service hasn&apos;t published a summary of this bill yet. Read the full
                text, or use the prompt below to get a plain-English breakdown.
              </p>
            )}
          </Card>

          <AiSummaryPrompt billTitle={title} govtrackUrl={govtrackUrl(bill.congress, bill.bill_slug)} hasSummary={!!bill.summary} />
        </div>

        <aside className="lg:sticky lg:top-24">
          <Card as="section" aria-labelledby="vote-heading" className="shadow-pop">
            <h2 id="vote-heading" className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Vote className="h-5 w-5 text-gold-bright" aria-hidden="true" />
              How would you vote?
            </h2>
            <p className="mt-1.5 mb-5 text-sm leading-relaxed text-ink-2">
              We&apos;ll show you how the community voted and whether your senators and representative agree with you.
            </p>
            {session ? (
              <VoteForm billSlug={bill.bill_slug} congress={bill.congress} title={title} summary={bill.summary || ""} />
            ) : (
              <div className="space-y-3">
                <ButtonLink href={loginHref(returnTo, "/signup")} size="lg" fullWidth>
                  Create a free account to vote
                </ButtonLink>
                <ButtonLink href={loginHref(returnTo)} variant="secondary" size="lg" fullWidth>
                  Log in
                </ButtonLink>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
