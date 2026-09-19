"use client";

import { useState } from "react";
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, ExternalLink, MapPin, Printer, ShieldCheck, Trash2 } from "lucide-react";
import type { BallotContest, BallotData } from "@/lib/ballot-types";
import { contestOptions, emptyPreparation, preparationStorageKey, sanitizePreparation, type BallotPreparation } from "@/lib/ballot-preparation";
import BallotContestCard from "./BallotContestCard";
import styles from "./ballot.module.css";

function formatDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function BallotWorkspace({ ballot, onChangeLocation }: { ballot: BallotData; onChangeLocation: () => void }) {
  const parties = Array.from(new Set(ballot.contests.map((contest) => contest.primaryParty).filter((party): party is string => Boolean(party))));
  const [party, setParty] = useState("");
  const needsParty = parties.length > 0;
  const hasNonpartisan = ballot.contests.some((contest) => !contest.primaryParty);
  const contests = ballot.contests.filter((contest) => !contest.primaryParty || (party !== "__nonpartisan__" && contest.primaryParty === party));

  return <section className={styles.workspace} aria-label="My ballot preparation">
    <div className={styles.workspaceTop}><button className={styles.textButton} type="button" onClick={onChangeLocation}><ArrowLeft size={16} aria-hidden="true" /> {ballot.coverage === "sample" ? "Back to ballot lookup" : "Change address or election"}</button><span className={styles.badge}>{ballot.coverage === "sample" ? "Example ballot" : "Address lookup result"}</span></div>
    <div className={styles.electionHeading}><div><p className={styles.eyebrow}>{ballot.coverage === "sample" ? "Explore the experience" : "Your election"}</p><h2>{ballot.election.name}</h2><div className={styles.electionMeta}><span><CalendarDays size={16} aria-hidden="true" /> {formatDate(ballot.election.date)}</span><span><MapPin size={16} aria-hidden="true" /> {ballot.locationLabel}</span></div></div></div>
    <div className={`${styles.coverage} ${ballot.coverage === "sample" ? styles.exampleCoverage : ""}`}><ShieldCheck size={22} aria-hidden="true" /><div><strong>{ballot.coverage === "sample" ? "Fictional example — not your actual ballot" : "Available ballot information · Completeness not confirmed"}</strong><p>{ballot.coverage === "sample" ? "Try choosing candidates, comparing information, and making notes. All names, questions, and voting details here are illustrative." : "Some races, local offices, or questions may be missing. Check your election office’s official sample ballot for the complete wording, order, and instructions."}</p>{ballot.coverage !== "sample" && <span className={styles.small}>Retrieved {formatDate(ballot.checkedAt)} · Address lookup does not confirm registration or eligibility.</span>}</div></div>
    {needsParty && <div className={styles.partyPicker}><label htmlFor="primary-party">Which primary ballot are you preparing for?</label><select id="primary-party" value={party} onChange={(event) => setParty(event.target.value)}><option value="">Choose a ballot</option>{parties.map((name) => <option key={name} value={name}>{name}</option>)}{hasNonpartisan && <option value="__nonpartisan__">Nonpartisan contests only</option>}</select><p className={styles.small}>The available party contests are shown by the source. Confirm which primary you’re eligible to vote in with your election office.</p></div>}
    {needsParty && !party ? <p className={styles.notice}>Choose a party ballot above to view its contests and your preparation notes.</p> : <PreparationView key={`${ballot.id}:${party}`} ballot={ballot} contests={contests} party={party} />}
  </section>;
}

function PreparationView({ ballot, contests, party }: { ballot: BallotData; contests: BallotContest[]; party: string }) {
  const [preparation, setPreparation] = useState<BallotPreparation>(emptyPreparation);
  const [saveOnDevice, setSaveOnDevice] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);
  const [storageMessage, setStorageMessage] = useState("");
  const [filter, setFilter] = useState("All contests");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const storageKey = preparationStorageKey(ballot.id, party);
  const levels = Array.from(new Set(contests.map((contest) => contest.level)));
  const reviewed = preparation.reviewed.length;
  const filtered = contests.filter((contest) => (filter === "All contests" || contest.level === filter) && (!reviewOnly || !preparation.reviewed.includes(contest.id)));

  function update(next: BallotPreparation) {
    setHasEdited(true);
    setPreparation(next);
    if (!saveOnDevice) return;
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setStorageMessage("Saved on this browser."); }
    catch { setStorageMessage("This browser couldn’t save your changes. Keep this page open or print your preparation."); }
  }

  function setSaving(enabled: boolean) {
    if (enabled) {
      try {
        const stored = localStorage.getItem(storageKey);
        const restore = Boolean(stored) && !hasEdited;
        const next = restore ? sanitizePreparation(JSON.parse(stored!), contests) : preparation;
        setPreparation(next); localStorage.setItem(storageKey, JSON.stringify(next)); setSaveOnDevice(true);
        setStorageMessage(restore ? "Previous preparation restored for this ballot." : "Saved on this browser.");
      } catch { setSaveOnDevice(false); setStorageMessage("Saving isn’t available in this browser. You can still prepare and print during this visit."); }
    } else {
      try { localStorage.removeItem(storageKey); setSaveOnDevice(false); setStorageMessage("Saved copy removed. Your current notes stay open until you leave."); }
      catch { setStorageMessage("The saved copy couldn’t be removed. Try clearing this site’s browser data."); }
    }
  }

  function clearPreparation() {
    try { localStorage.removeItem(storageKey); setSaveOnDevice(false); setHasEdited(true); setPreparation(emptyPreparation()); setStorageMessage("Choices and notes cleared for this ballot."); }
    catch { setStorageMessage("The saved copy couldn’t be removed. Try clearing this site’s browser data."); }
  }

  return <>
    <div className={styles.ballotColumns}>
      <div>
        <div className={styles.listHeading}><div><h3>{showReview ? "Your preparation at a glance" : "Your ballot guide"}</h3><p className={styles.small}>{contests.length} {ballot.coverage === "sample" ? "example contests" : "available contests"} · {showReview ? "Personal reference only" : "Shown in the order supplied by the source"}</p></div><button type="button" className={styles.secondaryButton} onClick={() => setShowReview(!showReview)}>{showReview ? "Back to contests" : "Review choices"}</button></div>
        {showReview ? <div className={styles.reviewList}><PreparationSummary contests={contests} preparation={preparation} /></div> : <>
          {contests.length > 0 && <div className={styles.filters}><div role="group" aria-label="Filter contests">{["All contests", ...levels].map((level) => <button key={level} type="button" aria-pressed={filter === level} onClick={() => setFilter(level)}>{level}</button>)}</div><label><input type="checkbox" checked={reviewOnly} onChange={(event) => setReviewOnly(event.target.checked)} /> Still to review</label></div>}
          {filtered.map((contest, index) => <BallotContestCard key={contest.id} contest={contest} initiallyOpen={index === 0} choices={preparation.choices[contest.id] ?? []} note={preparation.notes[contest.id] ?? ""} reviewed={preparation.reviewed.includes(contest.id)} onChoices={(choices) => update({ ...preparation, choices: { ...preparation.choices, [contest.id]: choices } })} onNote={(note) => update({ ...preparation, notes: { ...preparation.notes, [contest.id]: note } })} onReviewed={(isReviewed) => update({ ...preparation, reviewed: isReviewed ? [...preparation.reviewed, contest.id] : preparation.reviewed.filter((id) => id !== contest.id) })} />)}
          {contests.length === 0 ? <div className={styles.empty}><h3>Contest details aren’t available yet.</h3><p>This doesn’t mean your ballot is empty. Use the official links to check what’s on your ballot.</p></div> : filtered.length === 0 && <div className={styles.empty}><Check size={24} aria-hidden="true" /><h3>No contests match this view.</h3><p>Change the filters to see the other contests.</p></div>}
        </>}
      </div>
      <aside className={styles.sidebar}>
        <section className={styles.preparationCard}><p className={styles.eyebrow}>Your preparation</p><div className={styles.progressCount}><strong>{reviewed}<span> / {contests.length}</span></strong><span>contests reviewed</span></div><progress value={reviewed} max={Math.max(contests.length, 1)} aria-label="Contests reviewed" /><p className={styles.small} aria-live="polite">{reviewed === contests.length && contests.length > 0 ? "You’ve reviewed the available contests. Check the official ballot for anything missing." : "It’s okay to leave a choice undecided."}</p><button type="button" className={styles.primaryButton} onClick={() => window.print()} disabled={contests.length === 0}><Printer size={16} aria-hidden="true" /> Print my preparation</button>
          <div className={styles.privacy}><label><input type="checkbox" checked={saveOnDevice} onChange={(event) => setSaving(event.target.checked)} /> Save notes on this device</label><p className={styles.small}>Optional. Choices and notes stay in this browser, not in your Heard account. Other people using this browser may see them. Your address is not saved.</p><p className={styles.small}>To restore a saved ballot, enable this before making new notes or choices. Otherwise, your current work replaces the saved copy.</p><p role="status" className={styles.small}>{storageMessage}</p><button type="button" className={styles.textButton} onClick={clearPreparation}><Trash2 size={14} aria-hidden="true" /> Clear my choices & notes</button></div>
        </section>
        <section className={styles.sourceCard}><ShieldCheck size={22} aria-hidden="true" /><h3>Check your official ballot</h3><p className={styles.muted}>{ballot.coverage === "sample" ? "This example has no official sample ballot. For your real election, start with your election office." : "Confirm the full list of contests and voting instructions with your election office."}</p>{ballot.officialLinks.length > 0 ? ballot.officialLinks.map((link) => <a key={`${link.label}:${link.url}`} href={link.url} target="_blank" rel="noreferrer">{link.label}<ExternalLink size={14} aria-hidden="true" /></a>) : <a href="https://www.usa.gov/election-office" target="_blank" rel="noreferrer">Find your election office<ArrowUpRight size={15} aria-hidden="true" /></a>}</section>
        <section className={styles.sourceCard}><CalendarDays size={22} aria-hidden="true" /><h3>Make a voting plan</h3>{ballot.mailOnly && <p className={styles.notice}>The source identifies this as a mail-only precinct. Confirm return options with your election office.</p>}{ballot.locations.length > 0 ? ballot.locations.map((location, index) => <div className={styles.location} key={`${location.kind}:${index}`}><span className={styles.eyebrow}>{location.kind}</span><h4>{location.name}</h4><p>{location.address}</p>{location.hours && <p>{location.hours}</p>}{location.notes && <p className={styles.small}>{location.notes}</p>}</div>) : <p className={styles.muted}>Polling locations and hours haven’t been supplied here. Check registration, deadlines, early voting, and mail options with your election office.</p>}<a href="https://www.usa.gov/election-office" target="_blank" rel="noreferrer">Check official voting information<ArrowUpRight size={15} aria-hidden="true" /></a></section>
      </aside>
    </div>
    <section className={styles.printSheet} aria-label="Printable preparation sheet"><h1>Heard · My election preparation</h1><h2>{ballot.election.name}</h2><p>{formatDate(ballot.election.date)} · {ballot.locationLabel}{party === "__nonpartisan__" ? " · Nonpartisan contests only" : party ? ` · ${party} primary` : ""}</p><p><strong>{ballot.coverage === "sample" ? "FICTIONAL EXAMPLE — NOT YOUR BALLOT" : "PARTIAL INFORMATION — VERIFY WITH YOUR OFFICIAL SAMPLE BALLOT"}</strong></p><p>This is a personal reference, not an official ballot. No vote has been cast. Check local rules about bringing notes or devices into the polling place.</p><PreparationSummary contests={contests} preparation={preparation} />{ballot.officialLinks.map((link) => <p key={link.url}>{link.label}: {link.url}</p>)}<p>Information retrieved: {formatDate(ballot.checkedAt)}</p></section>
  </>;
}

function PreparationSummary({ contests, preparation }: { contests: BallotContest[]; preparation: BallotPreparation }) {
  return <>{contests.map((contest) => {
    const selected = contestOptions(contest).filter((option) => (preparation.choices[contest.id] ?? []).includes(option.id));
    return <article key={contest.id} className={styles.summaryItem}><span className={styles.small}>{contest.level}{contest.special ? " · Special election" : ""} · {preparation.reviewed.includes(contest.id) ? "Reviewed" : "To review"}</span><h3>{contest.title}</h3><p>{selected.length ? selected.map((option) => option.label).join(", ") : "Still deciding / no choice noted"}</p>{preparation.notes[contest.id] && <p className={styles.preserveLines}>{preparation.notes[contest.id]}</p>}</article>;
  })}</>;
}
