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
import User from "@/models/User";
import Post from "@/models/Post";
import GlassCard from "@/components/ui/GlassCard";
import VoteStats from "@/components/features/VoteStats";
import RepVoteDisplay from "@/components/features/RepVoteDisplay";
import MagneticButton from "@/components/ui/MagneticButton";
import { ExternalLink } from "lucide-react";

interface VotedPageProps {
  params: Promise<{ slug: string; congress: string }>;
}

export default async function VotedPage({ params }: VotedPageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  await connectDB();
  const { slug, congress } = await params;

  const bill = await fetchBillDetails(congress, slug);
  if (!bill) redirect("/bills");

  const userState = session.user.state;
  const userCd = session.user.cd;

  // Determine which chamber this bill belongs to
  const parsed = parseBillSlug(bill.bill_slug);
  const houseBillTypes = ["hr", "hres", "hjres", "hconres"];
  const isHouseBill = houseBillTypes.includes(bill.bill_type || "");

  // Only fetch and show the relevant chamber's representatives
  const repVotes: { name: string; vote: string; role: string }[] = [];

  if (isHouseBill) {
    // House bill — only show House representative
    const houseReps = await fetchMembers(userState, userCd);
    if (houseReps.length > 0 && parsed) {
      const vote = await getMemberVoteOnBill(
        houseReps[0].id,
        congress,
        parsed.type,
        parsed.number,
        "house"
      );
      repVotes.push({
        name: houseReps[0].name,
        vote,
        role: "House Representative",
      });
    }
  } else {
    // Senate bill — only show Senators
    const allStateMembers = await fetchMembers(userState);
    const senators = allStateMembers.filter(
      (m) => !m.district || m.district === 0
    );
    for (const senator of senators.slice(0, 2)) {
      if (parsed) {
        const vote = await getMemberVoteOnBill(
          senator.id,
          congress,
          parsed.type,
          parsed.number,
          "senate"
        );
        repVotes.push({ name: senator.name, vote, role: "Senator" });
      }
    }
  }

  // Get Heard community vote counts
  const yeasCount = await User.countDocuments({
    yeaBillSlugs: bill.bill_slug,
  });
  const naysCount = await User.countDocuments({
    nayBillSlugs: bill.bill_slug,
  });
  const yeasByDistrict = await User.countDocuments({
    yeaBillSlugs: bill.bill_slug,
    state: userState,
    cd: userCd,
  });
  const naysByDistrict = await User.countDocuments({
    nayBillSlugs: bill.bill_slug,
    state: userState,
    cd: userCd,
  });

  // Check if user has a post for this bill
  const existingPost = await Post.findOne({
    user: session.user.id,
    billSlug: bill.bill_slug,
  }).lean();

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

      {/* Community Vote Stats */}
      <GlassCard>
        <h2 className="font-brand text-xl text-cream mb-6 text-center">
          Community Votes
        </h2>
        <VoteStats
          yeas={yeasCount}
          nays={naysCount}
          yeasByDistrict={yeasByDistrict}
          naysByDistrict={naysByDistrict}
        />
      </GlassCard>

      {/* Representative Votes */}
      <GlassCard>
        <h2 className="font-brand text-xl text-cream mb-4">
          {isHouseBill
            ? "Your House Representative\u2019s Vote"
            : "Your Senators\u2019 Votes"}
        </h2>
        <RepVoteDisplay reps={repVotes} />
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
