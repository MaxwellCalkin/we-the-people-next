export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import {
  fetchBillDetails,
  fetchMembers,
  getMemberVoteOnBill,
  parseBillSlug,
} from "@/lib/congress";
import Post from "@/models/Post";
import GlassCard from "@/components/ui/GlassCard";
import VoteStats from "@/components/features/VoteStats";
import RepVoteDisplay from "@/components/features/RepVoteDisplay";
import MagneticButton from "@/components/ui/MagneticButton";
import { ExternalLink, Users, FileText } from "lucide-react";

interface VotedPageProps {
  params: Promise<{ slug: string; congress: string }>;
}

export default async function VotedPage({ params }: VotedPageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  await connectDB();
  const { slug, congress } = await params;

  const userState = session.user.state;
  const userCd = session.user.cd;
  const parsed = parseBillSlug(slug);

  // Fan out all independent I/O concurrently. Previously this page did
  // ~6 sequential awaits (bill → senators → 2× senator votes → house reps →
  // house vote → post), which made cold loads feel slow. None of these
  // actually depend on each other: the bill fetch only gates redirect, and
  // rep-vote lookups are keyed off the URL slug, not the bill response.
  const [bill, allStateMembers, houseReps, existingPost] = await Promise.all([
    fetchBillDetails(congress, slug),
    fetchMembers(userState),
    fetchMembers(userState, userCd),
    Post.findOne({ user: session.user.id, billSlug: slug }).lean(),
  ]);

  if (!bill) redirect("/bills");

  const senators = allStateMembers
    .filter((m) => !m.district || m.district === 0)
    .slice(0, 2);

  const repVotes: { name: string; vote: string; role: string }[] = [];
  if (parsed) {
    const voteTargets = [
      ...senators.map((s) => ({
        id: s.id,
        name: s.name,
        role: "Senator" as const,
        chamber: "senate" as const,
      })),
      ...(houseReps[0]
        ? [{
            id: houseReps[0].id,
            name: houseReps[0].name,
            role: "House Representative" as const,
            chamber: "house" as const,
          }]
        : []),
    ];
    const votes = await Promise.all(
      voteTargets.map((t) =>
        getMemberVoteOnBill(t.id, congress, parsed.type, parsed.number, t.chamber)
      )
    );
    voteTargets.forEach((t, i) => {
      repVotes.push({ name: t.name, vote: votes[i], role: t.role });
    });
  }

  const govtrackUrl = `https://www.govtrack.us/congress/bills/${congress}/${bill.bill_slug}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Bill Info */}
      <GlassCard>
        <h1 className="font-brand text-2xl sm:text-3xl text-gradient mb-4">
          {bill.short_title || bill.title}
        </h1>
        <a
          href={govtrackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-gold text-sm hover:text-gold/80 transition-colors"
        >
          View on GovTrack <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </GlassCard>

      {/* CBO Budget Impact */}
      {bill.cboCostEstimates && bill.cboCostEstimates.length > 0 && (
        <GlassCard>
          <div className="flex items-start gap-4">
            <div className="shrink-0 h-12 w-12 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
              <FileText className="h-6 w-6 text-gold" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] uppercase tracking-widest text-gold/80">
                Congressional Budget Office
              </p>
              <h2 className="font-brand text-xl text-cream mt-0.5">
                {bill.cboCostEstimates.length === 1
                  ? "Budget Impact Estimate"
                  : `${bill.cboCostEstimates.length} Budget Estimates`}
              </h2>
              <p className="text-cream/50 text-xs mt-1">
                The CBO publishes nonpartisan cost analyses of legislation. Figures aren&apos;t
                machine-readable, so we link to the full report.
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {bill.cboCostEstimates.map((est, i) => (
              <li key={i}>
                <a
                  href={est.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-gold/40 transition-colors p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-cream font-medium text-sm group-hover:text-gold transition-colors">
                      {est.title || "CBO Cost Estimate"}
                    </p>
                    <ExternalLink className="h-4 w-4 text-cream/40 group-hover:text-gold shrink-0 mt-0.5 transition-colors" />
                  </div>
                  {est.description && (
                    <p className="text-cream/60 text-xs mt-1.5 leading-relaxed">
                      {est.description}
                    </p>
                  )}
                  {est.pubDate && (
                    <p className="mt-3 inline-block text-[0.6rem] uppercase tracking-wider text-cream/40 bg-white/5 rounded px-2 py-0.5">
                      Published {new Date(est.pubDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      {/* Community Vote Stats */}
      <GlassCard>
        <h2 className="font-brand text-xl text-cream mb-6 text-center">
          Community Votes
        </h2>
        <VoteStats billSlug={bill.bill_slug} />
      </GlassCard>

      {/* Representative Votes */}
      <GlassCard>
        <h2 className="font-brand text-xl text-cream mb-4">
          Your Representatives&apos; Votes
        </h2>
        <RepVoteDisplay reps={repVotes} />
        <div className="mt-4 pt-4 border-t border-white/10">
          <Link
            href={`/vote/${slug}/${congress}/votes`}
            className="inline-flex items-center gap-1.5 text-gold text-sm hover:text-gold/80 transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            See how all members voted
          </Link>
        </div>
      </GlassCard>

      {/* Post CTA */}
      <GlassCard className="text-center">
        {existingPost ? (
          <div>
            <p className="text-cream/70 mb-4">
              You already have a post for this bill.
            </p>
            <MagneticButton
              href={`/post/${String(existingPost._id)}`}
            >
              View Your Post
            </MagneticButton>
          </div>
        ) : (
          <div>
            <p className="text-cream/70 mb-4">
              Share your thoughts on this bill with the community!
            </p>
            <MagneticButton
              href={`/vote/${slug}/${congress}/voted?createPost=true`}
            >
              Create a Post
            </MagneticButton>
          </div>
        )}
      </GlassCard>

      {/* Inline Create Post Form */}
      <CreatePostSection billSlug={slug} billCongress={congress} />
    </div>
  );
}

// This is a wrapper that conditionally shows the form based on URL param
// Since this needs client interactivity, we import the form as a client component
import CreatePostForm from "@/components/features/CreatePostForm";

async function CreatePostSection({
  billSlug,
  billCongress,
}: {
  billSlug: string;
  billCongress: string;
}) {
  return (
    <div id="create-post">
      <CreatePostInlineWrapper
        billSlug={billSlug}
        billCongress={billCongress}
      />
    </div>
  );
}

function CreatePostInlineWrapper({
  billSlug,
  billCongress,
}: {
  billSlug: string;
  billCongress: string;
}) {
  return <CreatePostForm billSlug={billSlug} billCongress={billCongress} />;
}
