import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  Landmark,
  Lock,
  MapPin,
  Megaphone,
  Scale,
  ShieldCheck,
  Vote,
  X,
} from "lucide-react";
import { getViewer } from "@/lib/viewer";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SkipLink from "@/components/layout/SkipLink";
import { ButtonLink } from "@/components/ui/Button";

const steps = [
  {
    title: "Tell us your district",
    body: "Enter your ZIP code once so we know who represents you. We use it to find your district and never store it.",
  },
  {
    title: "Vote on real bills",
    body: "Read plain summaries of legislation moving through Congress and cast your own Yea or Nay.",
  },
  {
    title: "See who's listening",
    body: "We compare your votes with your senators' and representative's actual roll-call votes.",
  },
];

const features = [
  {
    icon: FileText,
    title: "Bills",
    body: "Browse what's trending, new, and most-voted, with links to the full text and CBO cost estimates.",
    href: "/bills",
    cta: "Browse bills",
  },
  {
    icon: Landmark,
    title: "Members of Congress",
    body: "Alignment scores, voting records, committees, and campaign finance for every member.",
    href: "/members",
    cta: "Explore members",
  },
  {
    icon: Vote,
    title: "My ballot",
    body: "Look up what's on your ballot by address, research your choices, and print a personal plan.",
    href: "/elections",
    cta: "Prepare for election day",
  },
  {
    icon: Megaphone,
    title: "Community proposals",
    body: "Pitch an idea for a new law, upvote others, and see a map of where the support comes from.",
    href: "/proposals",
    cta: "See proposals",
  },
];

const principles = [
  {
    icon: Scale,
    title: "Nonpartisan",
    body: "We never tell you how to vote. Scores only measure how often a member votes the way you do.",
  },
  {
    icon: Lock,
    title: "Private by default",
    body: "Your ZIP code finds your district and is discarded. Ballot lookups aren't saved to your account.",
  },
  {
    icon: ShieldCheck,
    title: "Built on the record",
    body: "Votes, bills, and finance data come straight from Congress.gov, the FEC, and official sources.",
  },
];

export default async function LandingPage() {
  const viewer = await getViewer();
  const signedIn = Boolean(viewer);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SkipLink />
      <Navbar userName={viewer?.name ?? ""} userImage={viewer?.avatar} district={viewer?.district} />

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="bg-hero-glow absolute inset-0" aria-hidden="true" />
          <div className="bg-grid absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-28 lg:pt-24">
            <div className="animate-fade-up">
              <p className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/70 px-3 py-1 text-xs font-medium text-ink-2">
                <span className="h-1.5 w-1.5 rounded-full bg-yea" aria-hidden="true" />
                Free, nonpartisan, and built on the public record
              </p>
              <h1 className="mt-6 font-brand text-[2.9rem] font-semibold leading-[1.02] text-ink sm:text-6xl lg:text-[4.4rem] text-balance">
                Are you being <span className="text-gold-gradient">represented?</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2 text-pretty">
                Vote on the same bills Congress does. Heard compares your choices with how your senators and
                representative actually voted, so you can see who&apos;s listening.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                {signedIn ? (
                  <ButtonLink href="/profile" size="lg" iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
                    Go to my dashboard
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/signup" size="lg" iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
                    Get started, it&apos;s free
                  </ButtonLink>
                )}
                <ButtonLink href="/bills" size="lg" variant="secondary">
                  Browse bills
                </ButtonLink>
              </div>
              {!signedIn && (
                <p className="mt-5 text-sm text-ink-3">
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-gold-bright hover:text-gold underline-offset-4 hover:underline">
                    Log in
                  </Link>
                </p>
              )}
            </div>

            <ProductPreview />
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-heading" className="border-t border-line bg-navy-950/40">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="eyebrow">How Heard works</p>
              <h2 id="how-heading" className="mt-3 font-brand text-4xl font-semibold text-ink text-balance">
                Three steps from opinion to accountability
              </h2>
            </div>
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step.title} className="card relative p-6">
                  <span className="font-brand text-4xl font-semibold leading-none text-gold-bright">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section aria-labelledby="features-heading">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow">Everything in one place</p>
                <h2 id="features-heading" className="mt-3 font-brand text-4xl font-semibold text-ink text-balance">
                  Follow Congress, prepare for your ballot, and push new ideas
                </h2>
              </div>
              <p className="max-w-sm text-ink-3">
                Browsing is open to everyone. An account lets you vote and track your alignment.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {features.map((feature) => (
                <article key={feature.title} className="card card-interactive group relative p-6 sm:p-7">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold-bright ring-1 ring-gold/25">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-2">{feature.body}</p>
                  <Link
                    href={feature.href}
                    className="stretched-link mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-bright"
                  >
                    {feature.cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Principles */}
        <section aria-labelledby="principles-heading" className="border-y border-line bg-navy-950/40">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 id="principles-heading" className="sr-only">
              Our principles
            </h2>
            <ul className="grid gap-10 md:grid-cols-3">
              {principles.map((p) => (
                <li key={p.title} className="flex gap-4">
                  <p.icon className="mt-0.5 h-6 w-6 shrink-0 text-gold-bright" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold text-ink">{p.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden">
          <div className="bg-hero-glow absolute inset-0 opacity-80" aria-hidden="true" />
          <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
            <h2 className="font-brand text-4xl font-semibold text-ink sm:text-5xl text-balance">
              Make sure you&apos;re <span className="text-gold-gradient">heard</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-ink-2">
              It takes a minute to find your representatives and cast your first vote.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href={signedIn ? "/bills" : "/signup"} size="lg">
                {signedIn ? "Vote on a bill" : "Create your free account"}
              </ButtonLink>
              <ButtonLink href="/how-it-works" size="lg" variant="ghost">
                How a bill becomes law
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <Footer state={viewer?.state} />
    </div>
  );
}

/** Illustrative product snapshot; names and numbers are examples, not real records. */
function ProductPreview() {
  const reps = [
    { role: "Senator", initials: "SA", vote: "Yea", agrees: true },
    { role: "Senator", initials: "SB", vote: "Nay", agrees: false },
    { role: "Representative", initials: "RC", vote: "Yea", agrees: true },
  ];
  return (
    <div
      role="img"
      aria-label="Example: Heard shows your vote on a bill, the community result, and whether each of your representatives voted the same way."
      className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:120ms] lg:max-w-none"
    >
      <div aria-hidden="true" className="card relative overflow-hidden p-6 shadow-pop sm:pb-16">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full border border-line-strong px-2 py-0.5 text-xs font-medium text-ink-2">
            Example bill · House
          </span>
          <span className="rounded-full border border-yea/30 bg-yea/10 px-2 py-0.5 text-xs font-semibold text-yea">
            You voted Yea
          </span>
        </div>
        <p className="mt-4 text-lg font-semibold leading-snug text-ink">Rural Broadband Expansion Act</p>
        <p className="mt-1 text-sm text-ink-3">Passed the House · Senate vote pending</p>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs text-ink-3">
            <span>Community vote</span>
            <span className="tabular-nums">1,284 votes</span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="w-[64%] bg-yea" />
            <div className="w-[36%] bg-nay" />
          </div>
          <div className="mt-1.5 flex justify-between text-xs font-medium tabular-nums">
            <span className="text-yea">64% Yea</span>
            <span className="text-nay">36% Nay</span>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <p className="text-xs font-medium text-ink-3">Your representatives</p>
          {reps.map((rep) => (
            <div
              key={rep.initials}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/70 px-3 py-2.5"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-ink-2 ring-1 ring-line-strong">
                {rep.initials}
              </span>
              <span className="flex-1 text-sm text-ink">{rep.role}</span>
              <span className={`text-xs font-semibold ${rep.vote === "Yea" ? "text-yea" : "text-nay"}`}>
                {rep.vote}
              </span>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  rep.agrees ? "bg-yea/15 text-yea" : "bg-nay/15 text-nay"
                }`}
              >
                {rep.agrees ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 hidden text-right text-xs text-ink-3 sm:block">Updated after every roll call</p>
      </div>

      <div
        aria-hidden="true"
        className="card absolute -bottom-14 -left-4 hidden w-56 p-4 shadow-pop sm:block lg:-left-10 animate-fade-up [animation-delay:320ms]"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-ink-3">
          <MapPin className="h-3.5 w-3.5 text-gold-bright" />
          Your alignment
        </div>
        <p className="mt-2 text-2xl font-semibold text-yea tabular-nums">67%</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full w-2/3 rounded-full bg-yea" />
        </div>
        <p className="mt-2 text-xs text-ink-3">Votes your way 2 of 3 times</p>
      </div>
    </div>
  );
}
