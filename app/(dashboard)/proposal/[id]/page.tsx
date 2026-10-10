import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Comment from "@/models/Comment";
import { getProposalById } from "@/lib/proposals";
import { formatDate } from "@/lib/format";
import Card from "@/components/ui/Card";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import { Breadcrumbs } from "@/components/ui/PageHeader";
import CommentSection from "@/components/features/CommentSection";
import UpvoteButton from "@/components/features/UpvoteButton";
import UpvoteHeatMap from "@/components/features/UpvoteHeatMap";
import DeleteProposalButton from "@/components/features/DeleteProposalButton";
import { proposalLocation } from "@/components/features/ProposalCard";

interface ProposalPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProposalPageProps): Promise<Metadata> {
  const { id } = await params;
  const proposal = await getProposalById(id).catch(() => null);
  return { title: proposal?.title ?? "Proposal" };
}

export default async function ProposalPage({ params }: ProposalPageProps) {
  await connectDB();
  const session = await auth();
  const { id } = await params;

  const proposal = await getProposalById(id, session?.user?.id).catch(() => null);
  if (!proposal) redirect("/proposals");

  const comments = await Comment.find({ proposal: id }).sort({ createdAt: -1 }).lean();
  const serializedComments = comments.map((c) => ({
    _id: c._id.toString(),
    comment: c.comment,
    likes: c.likes,
    createdAt: c.createdAt.toISOString(),
  }));

  const location = proposalLocation(proposal.authorState, proposal.authorDistrict);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Proposals", href: "/proposals" }, { label: proposal.title }]} className="mb-6" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="min-w-0 lg:col-start-1">
          {proposal.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proposal.image}
              alt=""
              className="mb-6 max-h-[28rem] w-full rounded-2xl border border-line object-cover"
            />
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-3">
            <span className="eyebrow">Proposal</span>
            {proposal.user?.userName && <span>by {proposal.user.userName}</span>}
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {location}
              </span>
            )}
            <time dateTime={proposal.createdAt}>{formatDate(proposal.createdAt)}</time>
          </div>
          <h1 className="mt-3 text-[1.9rem] font-semibold leading-tight text-ink sm:text-[2.4rem] text-balance">
            {proposal.title}
          </h1>
          <p className="mt-5 whitespace-pre-wrap text-[1.05rem] leading-[1.75] text-ink-2">{proposal.description}</p>
        </article>

        <aside className="space-y-4 self-start lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <Card>
            <UpvoteButton
              proposalId={id}
              initialCount={proposal.upvoteCount}
              initialUpvoted={proposal.hasUpvoted}
              canVote={!!session}
            />
            <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-ink-3">
              Upvotes are counted by state and district so representatives can see where support comes from.
            </p>
            <div className="mt-4">
              <CopyLinkButton label="Share this proposal" />
            </div>
          </Card>
          {proposal.isOwner && (
            <Card padding="sm">
              <p className="mb-2 text-xs font-medium text-ink-3">You wrote this proposal</p>
              <DeleteProposalButton proposalId={id} />
            </Card>
          )}
        </aside>

        <div className="min-w-0 space-y-8 lg:col-start-1">
          <Card as="section" aria-label="Where the support comes from">
            <UpvoteHeatMap
              byState={proposal.upvotesByState}
              byDistrict={proposal.upvotesByDistrict}
              totalUpvotes={proposal.upvoteCount}
              districtsAvailable={true}
              viewerState={session?.user?.state}
              viewerDistrict={session?.user?.cd}
            />
          </Card>

          <CommentSection proposalId={id} initialComments={serializedComments} canComment={!!session} />
        </div>
      </div>
    </div>
  );
}
