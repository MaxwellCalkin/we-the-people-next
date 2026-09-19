"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, MapPin, Search, ShieldCheck } from "lucide-react";
import type { BallotData, BallotElection, BallotElectionsResponse, BallotLookupResponse } from "@/lib/ballot-types";
import BallotWorkspace from "./BallotWorkspace";
import styles from "./ballot.module.css";

export function electionDate(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(value.getTime()) ? date : value.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function BallotExplorer({ lookupConfigured, example }: { lookupConfigured: boolean; example?: BallotData }) {
  const [address, setAddress] = useState("");
  const [electionId, setElectionId] = useState("");
  const [elections, setElections] = useState<BallotElection[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingBallot, setPendingBallot] = useState<BallotData | null>(null);
  const [ballot, setBallot] = useState<BallotData | null>(null);
  const request = useRef<AbortController | null>(null);
  const electionsRequest = useRef<AbortController | null>(null);
  const confirmation = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!lookupConfigured) return;
    const controller = new AbortController();
    electionsRequest.current = controller;
    fetch("/api/ballot/elections", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.json() as Promise<BallotElectionsResponse>)
      .then((data) => { if (!controller.signal.aborted) setElections(data.elections ?? []); })
      .catch(() => { /* Address lookup can work without the national election list. */ });
    return () => controller.abort();
  }, [lookupConfigured]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (pendingBallot) confirmation.current?.focus(); }, [pendingBallot]);

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    electionsRequest.current?.abort();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setMessage(""); setPendingBallot(null);
    try {
      const response = await fetch("/api/ballot", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim(), ...(electionId ? { electionId } : {}) }),
        signal: controller.signal, cache: "no-store",
      });
      const result: BallotLookupResponse = await response.json();
      if (controller.signal.aborted) return;
      if (result.status === "ready" && result.ballot) setPendingBallot(result.ballot);
      else {
        if (result.elections?.length) setElections(result.elections);
        setMessage(result.message || "We couldn’t retrieve a ballot for this address. Please check with your election office.");
      }
    } catch {
      if (!controller.signal.aborted) setMessage("The ballot lookup could not be reached. Please try again or use your election office’s official lookup.");
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }

  function openExample() {
    request.current?.abort(); setLoading(false); setMessage(""); setPendingBallot(null);
    if (example) setBallot(example);
  }

  if (ballot) return <BallotWorkspace key={ballot.id} ballot={ballot} onChangeLocation={() => { setBallot(null); setPendingBallot(null); setMessage(""); }} />;

  return (
    <section className={styles.entry} aria-labelledby="find-ballot-title">
      <div className={styles.lookupCard}>
        <div className={styles.labelRow}><span className={styles.badge}><MapPin size={14} aria-hidden="true" /> Start with your address</span><span className={styles.muted}>No account needed</span></div>
        <h2 id="find-ballot-title">What’s on my ballot?</h2>
        <p className={styles.muted}>Your ballot depends on where you’re registered to vote—not just your ZIP code.</p>
        <form onSubmit={lookup} className={styles.lookupForm}>
          <label htmlFor="ballot-address">Registered voting address</label>
          <input id="ballot-address" autoComplete="street-address" value={address} onChange={(event) => { setAddress(event.target.value); setPendingBallot(null); }} placeholder="Street address, city, state, ZIP" required minLength={10} maxLength={300} disabled={loading || !lookupConfigured} aria-describedby="address-privacy" />
          {elections.length > 0 && <><label htmlFor="ballot-election">Election</label><select id="ballot-election" value={electionId} onChange={(event) => { setElectionId(event.target.value); setPendingBallot(null); }} disabled={loading}><option value="">Find the next available election</option>{elections.map((election) => <option key={election.id} value={election.id}>{election.name} · {electionDate(election.date)}</option>)}</select></>}
          <p id="address-privacy" className={styles.small}><ShieldCheck size={15} aria-hidden="true" /> Your address is sent to Google Civic Information to look up your ballot. Heard doesn’t save it.</p>
          <button type="submit" className={styles.primaryButton} disabled={loading || !lookupConfigured}><Search size={17} aria-hidden="true" /> {loading ? "Looking up your ballot…" : "Find my ballot"}<ArrowRight size={18} aria-hidden="true" /></button>
        </form>
        {!lookupConfigured && <p className={styles.notice}>Address lookup isn’t available yet. {example ? "Explore the example below, or " : "You can "}use your election office’s official ballot lookup.</p>}
        {message && <div className={styles.notice} role="alert"><p>{message}</p><a href="https://www.usa.gov/election-office" target="_blank" rel="noreferrer">Find my election office ↗</a></div>}
        {pendingBallot && <div className={styles.confirmation}>
          <h3 ref={confirmation} tabIndex={-1}>Is this your voting address?</h3>
          <p>{pendingBallot.normalizedAddress || address}</p><p className={styles.muted}>{pendingBallot.election.name} · {electionDate(pendingBallot.election.date)}</p>
          <button type="button" className={styles.primaryButton} onClick={() => setBallot(pendingBallot)}><Check size={17} aria-hidden="true" /> Yes, view this ballot</button>
          <p className={styles.small}>Address lookup doesn’t confirm voter registration or eligibility. Check both with your election office.</p>
        </div>}
        {example && <div className={styles.exampleEntry}><span className={styles.small}>Take a look around first</span><button type="button" onClick={openExample} className={styles.textButton}>Explore an example ballot <ArrowRight size={16} aria-hidden="true" /></button><span className={styles.small}>Fictional candidates and questions · Development preview</span></div>}
      </div>
      <aside className={styles.entryAside}>
        <p className={styles.eyebrow}>A little preparation. More confidence.</p>
        <ol className={styles.steps}>
          <li><span>01</span><div><h3>See what’s on the ballot</h3><p>Find available races and questions, with a clear picture of what still needs confirmation.</p></div></li>
          <li><span>02</span><div><h3>Make sense of your options</h3><p>Read the wording, explore candidate sources, and keep your own notes.</p></div></li>
          <li><span>03</span><div><h3>Bring your preparation</h3><p>Review your choices and print a personal reference sheet.</p></div></li>
        </ol>
        <div className={styles.officialCallout}><ShieldCheck size={22} aria-hidden="true" /><div><h3>Your election office has the final word.</h3><p>Availability varies by election and location. Always check the official sample ballot for the complete list.</p><a href="https://www.usa.gov/election-office" target="_blank" rel="noreferrer">Find your election office ↗</a></div></div>
      </aside>
    </section>
  );
}
