// app/(dashboard)/members/page.tsx
import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { getMemberDirectory } from "@/lib/member-directory";
import MemberDirectory from "@/components/features/MemberDirectory";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Members of Congress" };

export default async function MembersPage() {
  const members = await getMemberDirectory();

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
          title="Members of Congress couldn't be loaded"
          description="Congress.gov didn't send the member list. Try again in a few minutes."
          action={<ButtonLink href="/members">Try again</ButtonLink>}
        />
      ) : (
        <MemberDirectory members={members} />
      )}
    </div>
  );
}
