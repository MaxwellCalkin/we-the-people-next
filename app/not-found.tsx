import Link from "next/link";
import { FileText, Landmark, Vote } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";

const suggestions = [
  { href: "/bills", label: "Browse bills", icon: FileText },
  { href: "/members", label: "Members of Congress", icon: Landmark },
  { href: "/elections", label: "My ballot", icon: Vote },
];

export default function NotFound() {
  return (
    <main id="main" className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-canvas px-4 py-16">
      <div className="bg-hero-glow absolute inset-0" aria-hidden="true" />
      <div className="relative w-full max-w-md text-center">
        <Link href="/" aria-label="Heard home" className="inline-block rounded-lg">
          <LogoMark size={40} />
        </Link>
        <p className="mt-8 font-brand text-7xl font-semibold text-gold-gradient">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">We couldn&apos;t find that page</h1>
        <p className="mt-3 leading-relaxed text-ink-2">
          The link may be broken, or the page may have moved. Here are some places to pick up from:
        </p>
        <ul className="mt-6 grid gap-2 text-left">
          {suggestions.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-gold/50"
              >
                <s.icon className="h-4 w-4 text-gold-bright" aria-hidden="true" />
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
        <ButtonLink href="/" variant="ghost" className="mt-6">
          Go to the home page
        </ButtonLink>
      </div>
    </main>
  );
}
