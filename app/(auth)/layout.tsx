import { Check } from "lucide-react";
import Logo from "@/components/ui/Logo";

const benefits = [
  "Vote Yea or Nay on the bills before Congress",
  "See how often your senators and representative agree with you",
  "Prepare for your ballot and pitch ideas for new laws",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,40rem)]">
      <aside className="relative hidden overflow-hidden border-r border-line lg:block">
        <div className="bg-hero-glow absolute inset-0" aria-hidden="true" />
        <div className="bg-grid absolute inset-0" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Logo size="lg" />
          <div className="max-w-md">
            <p className="font-brand text-5xl font-semibold leading-[1.05] text-ink text-balance">
              Your voice, on the <span className="text-gold-gradient">record.</span>
            </p>
            <ul className="mt-10 space-y-4">
              {benefits.map((b) => (
                <li key={b} className="flex gap-3 text-ink-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-bright">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-ink-3">Free and nonpartisan. We never tell you how to vote.</p>
        </div>
      </aside>

      <main id="main" className="flex min-h-screen flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
