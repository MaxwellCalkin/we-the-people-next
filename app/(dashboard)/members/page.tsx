// app/(dashboard)/members/page.tsx
import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import connectDB from "@/lib/db";
import MemberScore from "@/models/MemberScore";
import MemberDirectory from "@/components/features/MemberDirectory";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Members of Congress" };

export default async function MembersPage() {
  await connectDB();

  const scores = await MemberScore.find().sort({ communityScore: -1 }).lean();

  const members = scores.map((s) => ({
    bioguideId: s.bioguideId,
    name: s.name,
    party: s.party,
    state: s.state,
    district: s.district,
    chamber: s.chamber,
    communityScore: s.communityScore,
    matchingVotes: s.matchingVotes,
    totalCompared: s.totalCompared,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Congress"
        title="Members of Congress"
        description={
          <>
            <strong className="font-semibold text-ink">Community alignment</strong>
            {" is how often a member's recorded votes match the majority of Heard voters on the same bills. It updates as people vote."}
          </>
        }
      />

      {members.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Member rankings aren't ready yet"
          description="Rankings appear once members' roll-call votes have been compared with community votes. Vote on a few bills to help get them started."
          action={<ButtonLink href="/bills">Vote on bills</ButtonLink>}
        />
      ) : (
        <MemberDirectory members={members} />
      )}
    </div>
  );
}
