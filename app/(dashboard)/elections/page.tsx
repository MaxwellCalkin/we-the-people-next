import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { auth } from "@/lib/auth";
import BallotExplorer from "@/components/features/ballot/BallotExplorer";
import StatePicker from "@/components/features/StatePicker";
import { exampleBallot } from "@/lib/ballot-demo";
import styles from "@/components/features/ballot/ballot.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My ballot" };

export default async function ElectionsIndexPage() {
  const session = await auth();
  // Signed in without a saved district (e.g. a brand-new Google account, which
  // lands here after sign-in): collect it first.
  if (session && (!session.user.state || !session.user.cd)) {
    redirect("/onboarding");
  }

  return (
    <div className={styles.page} data-ballot-page>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Elections / My ballot</p>
          <h1>Walk in prepared.</h1>
          <p className={styles.intro}>Understand what you’re voting on. Make a plan that’s yours.</p>
        </div>
        <Link href="/elections/calendar" className={styles.quietLink}>
          <CalendarDays size={17} aria-hidden="true" /> Federal election calendar <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </header>
      <BallotExplorer
        lookupConfigured={Boolean(process.env.GOOGLE_CIVIC_API_KEY || process.env.GOOGLE_KEY)}
        example={process.env.NODE_ENV === "development" ? exampleBallot : undefined}
      />
      <details className={styles.browse}>
        <summary>Explore federal races around the country <span>Candidate filings & campaign finance</span></summary>
        <div className={styles.browseBody}>
          <p className={styles.muted}>Research federal candidates and their funding. These FEC listings are separate from your confirmed election ballot.</p>
          <StatePicker />
        </div>
      </details>
    </div>
  );
}
