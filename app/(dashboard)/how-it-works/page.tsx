import type { Metadata } from "next";
import BillFlowchart from "@/components/features/BillFlowchart";
import PageHeader from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "How a bill becomes a law",
  description: "Learn how the legislative process works and where your voice fits in.",
};

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Civics 101"
        title="How a bill becomes a law"
        description="Ten steps from an idea to the law of the land. Knowing where a bill stands helps you speak up at the moment it matters."
      />

      <BillFlowchart />

      <section className="card relative mt-14 overflow-hidden p-8 text-center sm:p-12">
        <div className="bg-hero-glow absolute inset-0" aria-hidden="true" />
        <div className="relative">
          <h2 className="font-brand text-3xl font-semibold text-ink sm:text-4xl text-balance">Ready to make your voice heard?</h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-2">
            Browse the bills before Congress and vote on the issues that matter most to you.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/bills" size="lg">
              Browse bills
            </ButtonLink>
            <ButtonLink href="/members" size="lg" variant="secondary">
              Look up your members
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
