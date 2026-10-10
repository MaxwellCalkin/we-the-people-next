import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Logo from "@/components/ui/Logo";

interface FooterProps {
  /** Two-letter state code; deep-links voter registration when known. */
  state?: string;
}

const EXPLORE = [
  { href: "/bills", label: "Bills" },
  { href: "/members", label: "Members of Congress" },
  { href: "/elections", label: "My ballot" },
  { href: "/proposals", label: "Community proposals" },
];

const LEARN = [
  { href: "/how-it-works", label: "How a bill becomes law" },
  { href: "/elections/calendar", label: "Federal election calendar" },
];

export default function Footer({ state }: FooterProps) {
  const registerUrl = state ? `https://vote.gov/register/${state.toLowerCase()}/` : "https://vote.gov/";

  return (
    <footer className="mt-auto border-t border-line bg-navy-950/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:px-8">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-ink-3">
            Vote on the bills before Congress and see whether the people who represent you vote the same way.
          </p>
        </div>

        <nav aria-label="Explore">
          <h2 className="text-sm font-semibold text-ink">Explore</h2>
          <ul className="mt-3 space-y-2">
            {EXPLORE.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-ink-3 transition-colors hover:text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Learn">
          <h2 className="text-sm font-semibold text-ink">Learn</h2>
          <ul className="mt-3 space-y-2">
            {LEARN.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-ink-3 transition-colors hover:text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-ink">Make it count</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <a
                href={registerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-gold-bright transition-colors hover:text-gold"
              >
                Register to vote <span className="sr-only">(opens vote.gov)</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </li>
            <li>
              <a
                href="https://www.usa.gov/election-office"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-ink-3 transition-colors hover:text-ink"
              >
                Find your election office
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} Heard. Nonpartisan and independent.</p>
          <p>Data from Congress.gov, GovTrack, the FEC, and Google Civic Information.</p>
        </div>
      </div>
    </footer>
  );
}
