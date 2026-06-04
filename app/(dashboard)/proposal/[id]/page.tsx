import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Comment from "@/models/Comment";
import { getProposalById } from "@/lib/proposals";
import GlassCard from "@/components/ui/GlassCard";
import CommentSection from "@/components/features/CommentSection";
import UpvoteButton from "@/components/features/UpvoteButton";
import UpvoteHeatMap from "@/components/features/UpvoteHeatMap";
import DeleteProposalButton from "@/components/features/DeleteProposalButton";
import { ArrowLeft } from "lucide-react";

interface ProposalPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalPage({ params }: ProposalPageProps) {
  await connectDB();
  const session = await auth();
  const { id } = await params;

  const proposal = await getProposalById(id, session?.user?.id);
  if (!proposal) redirect("/proposals");

  const comments = await Comment.find({ proposal: id })
    .sort({ createdAt: -1 })
    .lean();

  const serializedComments = comments.map((c) => ({
    _id: c._id.toString(),
    comment: c.comment,
    likes: c.likes,
    createdAt: c.createdAt.toISOString(),
  }));

  const location = proposal.authorState
    ? `${proposal.authorState}${
        proposal.authorDistrict ? "-" + proposal.authorDistrict : ""
      }`
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back links */}
      <div className="flex gap-4 text-sm">
        <Link
          href="/proposals"
          className="inline-flex items-center gap-1.5 text-cream/60 hover:text-cream transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Proposals
        </Link>
        {session && (
          <Link
            href="/profile"
            className="text-cream/60 hover:text-cream transition-colors"
          >
            Back to Profile
          </Link>
        )}
      </div>

      {/* Proposal Content */}
      <GlassCard className="!p-0 overflow-hidden">
        {proposal.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proposal.image}
            alt={proposal.title}
            className="w-full max-h-[500px] object-cover"
          />
        )}
        <div className="p-6">
          <h1 className="font-brand text-2xl sm:text-3xl text-gradient mb-2">
            {proposal.title}
          </h1>
          <div className="flex items-center gap-3 mb-4">
            {proposal.user?.userName && (
              <p className="text-cream/40 text-sm">by {proposal.user.userName}</p>
            )}
            {location && (
              <span className="inline-flex items-center rounded-full border border-glass-border px-2.5 py-0.5 text-xs text-cream/60">
                {location}
              </span>
            )}
          </div>
          <p className="text-cream/70 text-sm leading-relaxed whitespace-pre-wrap">
            {proposal.description}
          </p>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-glass-border">
            <UpvoteButton
              proposalId={id}
              initialCount={proposal.upvoteCount}
              initialUpvoted={proposal.hasUpvoted}
              canVote={!!session}
            />
            {proposal.isOwner && <DeleteProposalButton proposalId={id} />}
          </div>
        </div>
      </GlassCard>

      {/* Upvote Heat Map */}
      <GlassCard>
        <UpvoteHeatMap
          byState={proposal.upvotesByState}
          byDistrict={proposal.upvotesByDistrict}
          totalUpvotes={proposal.upvoteCount}
          districtsAvailable={true}
        />
      </GlassCard>

      {/* Comments */}
      <CommentSection proposalId={id} initialComments={serializedComments} />
    </div>
  );
}
