import BillFlowchart from "@/components/features/BillFlowchart";
import GlassCard from "@/components/ui/GlassCard";
import MagneticButton from "@/components/ui/MagneticButton";

export const metadata = {
  title: "How a Bill Becomes a Law | Heard",
  description:
    "Learn how the legislative process works and where your voice fits in.",
};

export default function HowItWorksPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center mb-20">
        <h1 className="font-brand text-3xl sm:text-4xl lg:text-5xl text-gradient mb-4">
          How a Bill Becomes a Law
        </h1>
        <p className="text-cream/60 text-lg max-w-2xl mx-auto leading-relaxed">
          Understanding the legislative process is the first step to making your
          voice heard. Scroll through the 10 steps below.
        </p>
      </div>

      {/* Flowchart */}
      <section className="mb-32">
        <BillFlowchart />
      </section>

      {/* CTA Section */}
      <section className="flex justify-center">
        <GlassCard className="max-w-lg w-full text-center p-8 sm:p-10">
          <h2 className="font-brand text-2xl sm:text-3xl text-gradient mb-4">
            Ready to make your voice heard?
          </h2>
          <p className="text-cream/60 mb-8">
            Browse the latest bills before Congress and vote on the issues that
            matter most to you.
          </p>
          <MagneticButton href="/bills">Browse Bills</MagneticButton>
        </GlassCard>
      </section>
    </div>
  );
}
