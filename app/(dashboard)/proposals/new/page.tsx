// app/(dashboard)/proposals/new/page.tsx
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loginHref } from "@/lib/safe-redirect";
import ProposalForm from "@/components/features/ProposalForm";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export const metadata: Metadata = { title: "Propose a bill" };

const tips = [
  { title: "Name one change", body: "Proposals with a single, concrete goal get more support than broad wish lists." },
  { title: "Explain who it helps", body: "Say who is affected today and how life would be different if it passed." },
  { title: "Keep it civil", body: "Disagree with ideas, not people. Persuasive proposals win neighbors over." },
];

export default async function NewProposalPage() {
  const session = await auth();
  if (!session) redirect(loginHref("/proposals/new"));

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        breadcrumbs={[{ label: "Proposals", href: "/proposals" }, { label: "New proposal" }]}
        title="Propose a bill"
        description="Pitch an idea for a new federal law. Others can upvote it, and the map on your proposal shows where support comes from."
      />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card padding="lg">
          <ProposalForm />
        </Card>
        <aside aria-labelledby="tips-heading" className="lg:sticky lg:top-24">
          <h2 id="tips-heading" className="text-sm font-semibold text-ink">
            Tips for a strong proposal
          </h2>
          <ol className="mt-4 space-y-5">
            {tips.map((tip, i) => (
              <li key={tip.title} className="flex gap-3">
                <span className="font-brand text-2xl font-semibold leading-none text-gold-bright">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-ink">{tip.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-3">{tip.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
