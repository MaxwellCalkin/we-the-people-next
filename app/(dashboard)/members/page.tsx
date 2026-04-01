// app/(dashboard)/members/page.tsx
import connectDB from "@/lib/db";
import MemberScore from "@/models/MemberScore";
import MemberDirectory from "@/components/features/MemberDirectory";

export default async function MembersPage() {
  await connectDB();

  const scores = await MemberScore.find()
    .sort({ communityScore: -1 })
    .lean();

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-brand text-3xl sm:text-4xl text-gradient mb-2">
        Congress Directory
      </h1>
      <p className="text-cream/40 text-sm mb-8">
        {members.length} members ranked by community alignment
      </p>
      <MemberDirectory members={members} />
    </div>
  );
}
