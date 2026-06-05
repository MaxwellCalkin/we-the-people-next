// app/(dashboard)/proposals/new/page.tsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ProposalForm from "@/components/features/ProposalForm";

export default async function NewProposalPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ProposalForm />
    </div>
  );
}
