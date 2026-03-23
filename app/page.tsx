"use client";

import { Vote, Eye, Users, Scale } from "lucide-react";
import LandingNav from "@/components/layout/LandingNav";
import HeroAnimation from "@/components/animations/HeroAnimation";
import ParallaxSection from "@/components/animations/ParallaxSection";
import StaggerReveal from "@/components/animations/StaggerReveal";
import GlassCard from "@/components/ui/GlassCard";
import MagneticButton from "@/components/ui/MagneticButton";

const features = [
  {
    icon: Vote,
    title: "Real Democracy",
    description:
      "Everyone's vote is heard. Bringing politics to our smartphones makes everyone a part of the democratic process.",
  },
  {
    icon: Eye,
    title: "Transparency",
    description:
      "See how your representatives actually vote. Real-time updates on legislative actions, voting records, and policy decisions.",
  },
  {
    icon: Users,
    title: "Community",
    description:
      "Share your views and engage with others. Join a community of citizens committed to active civic participation.",
  },
  {
    icon: Scale,
    title: "Accountability",
    description:
      "Hold your leaders accountable. Compare their promises with their actions and demand better representation.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy-900 overflow-hidden">
      <LandingNav />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        <HeroAnimation />

        <ParallaxSection speed={0.3} className="relative z-10 text-center px-4">
          <h1 className="font-brand text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-cream tracking-wider mb-4">
            We The People
          </h1>
          <p className="text-2xl sm:text-3xl md:text-4xl font-brand font-light text-gradient mb-6">
            Your Voice Matters
          </p>
          <p className="max-w-2xl mx-auto text-lg text-cream/70 mb-10 leading-relaxed">
            Our mission is to force integrity and accountability onto our
            political leaders. Find out if you are being represented in
            Washington!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <MagneticButton
              href="/login"
              className="bg-transparent! border-2 border-cream/30 text-cream! hover:border-gold hover:text-gold!"
            >
              Log In
            </MagneticButton>
            <MagneticButton href="/signup">Sign Up</MagneticButton>
          </div>
        </ParallaxSection>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-cream/40 z-10">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-cream/40 to-transparent" />
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="font-brand text-3xl sm:text-4xl font-bold text-cream mb-4">
              Why We The People?
            </h2>
            <p className="text-cream/60 max-w-xl mx-auto">
              We believe in empowering every citizen with the tools to actively
              participate in democracy.
            </p>
          </div>

          <StaggerReveal
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            stagger={0.15}
          >
            {features.map((feature) => (
              <GlassCard key={feature.title} hover className="text-center py-8">
                <feature.icon className="mx-auto h-10 w-10 text-gold mb-4" />
                <h3 className="font-brand text-xl font-semibold text-cream mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm text-cream/60 leading-relaxed">
                  {feature.description}
                </p>
              </GlassCard>
            ))}
          </StaggerReveal>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <ParallaxSection speed={0.2}>
            <h2 className="font-brand text-3xl sm:text-4xl font-bold text-gradient mb-6">
              Ready to Make Your Voice Heard?
            </h2>
            <p className="text-cream/60 mb-10 text-lg">
              Join thousands of citizens taking an active role in shaping our
              democracy. Sign up today and start making a difference.
            </p>
            <MagneticButton href="/signup" className="text-lg px-10 py-4">
              Get Started
            </MagneticButton>
          </ParallaxSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-glass-border py-8 px-4 text-center">
        <p className="text-sm text-cream/40">
          &copy; {new Date().getFullYear()} We The People. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
