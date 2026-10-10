"use client";

import { Check, ChevronDown, ExternalLink, NotebookPen } from "lucide-react";
import type { BallotContest } from "@/lib/ballot-types";
import { contestOptions, toggleChoice } from "@/lib/ballot-preparation";
import styles from "./ballot.module.css";

interface Props {
  contest: BallotContest;
  choices: string[];
  note: string;
  reviewed: boolean;
  initiallyOpen: boolean;
  onChoices: (choices: string[]) => void;
  onNote: (note: string) => void;
  onReviewed: (reviewed: boolean) => void;
}

export default function BallotContestCard({ contest, choices, note, reviewed, initiallyOpen, onChoices, onNote, onReviewed }: Props) {
  const options = contestOptions(contest);
  const limit = contest.kind === "measure" ? (contest.voteFor ?? 1) : contest.voteFor;
  const instructions = limit === null ? "Check official voting instructions" : limit === 1 ? "Choose one" : `Choose up to ${limit}`;
  const inputName = `choice-${contest.id}`;
  const allOfficial = contest.sources.length > 0 && contest.sources.every((source) => source.official);

  return (
    <details className={styles.contest} open={initiallyOpen}>
      <summary className={styles.contestSummary}>
        <div><span className={styles.contestLevel}>{contest.level}{contest.district ? ` · ${contest.district}` : ""}</span><h3>{contest.title}</h3><p>{contest.special ? "Special election · " : ""}{contest.primaryParty ? `${contest.primaryParty} primary · ` : ""}{instructions}</p></div>
        <span className={styles.contestStatus}>{reviewed ? <><Check size={15} aria-hidden="true" /> Reviewed</> : "To review"}<ChevronDown className={styles.chevron} size={18} aria-hidden="true" /></span>
      </summary>
      <div className={styles.contestBody}>
        {contest.eligibility && <p className={styles.notice}>{contest.eligibility}</p>}
        {contest.kind === "measure" && <div className={styles.measureText}>
          {contest.measure?.summary && <><h4>About this question</h4><p>{contest.measure.summary}</p></>}
          {contest.measure?.text ? <details className={styles.research}><summary>Read the ballot wording</summary><p className={styles.preserveLines}>{contest.measure.text}</p></details> : <p className={styles.small}>The full wording wasn’t supplied. Check the official sample ballot before deciding.</p>}
          {(contest.measure?.yesMeaning || contest.measure?.noMeaning) && <div className={styles.meanings}>{contest.measure.yesMeaning && <p><strong>A Yes vote</strong>{contest.measure.yesMeaning}</p>}{contest.measure.noMeaning && <p><strong>A No vote</strong>{contest.measure.noMeaning}</p>}</div>}
          {contest.measure?.url && <a href={contest.measure.url} target="_blank" rel="noreferrer" className={styles.quietLink}>Read the source <ExternalLink size={14} aria-hidden="true" /></a>}
        </div>}
        <fieldset className={styles.options}>
          <legend>My preparation choice <span>This does not cast a vote.</span></legend>
          {options.map((option) => {
            const selected = choices.includes(option.id);
            const disabled = limit === null || (limit > 1 && choices.length >= limit && !selected);
            return <label className={`${styles.option} ${selected ? styles.optionSelected : ""}`} key={option.id}>
              <input type={limit === 1 ? "radio" : "checkbox"} name={inputName} value={option.id} checked={selected} disabled={disabled} onChange={() => onChoices(toggleChoice(contest, choices, option.id))} />
              <span><strong>{option.label}</strong>{option.party && <span>{option.party}</span>}</span>{selected && <Check size={17} aria-hidden="true" />}
            </label>;
          })}
          {limit === 1 && options.length > 0 && <label className={styles.undecided}><input type="radio" name={inputName} checked={choices.length === 0} onChange={() => onChoices([])} /> Still deciding / leave unselected</label>}
          {limit !== null && limit > 1 && <p className={styles.small}>{choices.length} of {limit} possible choices noted.{choices.length > 0 && <button type="button" className={styles.textButton} onClick={() => onChoices([])}>Clear choices</button>}</p>}
          {limit === null && <p className={styles.small}>Selection is unavailable because the number of permitted choices hasn’t been supplied. You can still take notes.</p>}
          {options.length === 0 && <p className={styles.notice}>Options haven’t been supplied for this contest. This does not mean there are no candidates or choices.</p>}
        </fieldset>
        {contest.kind === "candidate" && options.length > 0 && <details className={styles.research}>
          <summary>Compare candidate information <ExternalLink size={14} aria-hidden="true" /></summary>
          <p className={styles.small}>Explore each candidate’s own materials. Missing information is not an assessment of a candidate.</p>
          <div className={styles.comparison}>{options.map((option) => <div key={option.id}><h4>{option.label}</h4><p>{option.party || "Party not supplied"}</p>{option.url ? <a href={option.url} target="_blank" rel="noreferrer">Candidate website ↗</a> : <p className={styles.small}>Website not supplied</p>}</div>)}</div>
        </details>}
        <div className={styles.notes}><label htmlFor={`notes-${contest.id}`}><NotebookPen size={16} aria-hidden="true" /> My research notes</label><textarea id={`notes-${contest.id}`} value={note} maxLength={2000} rows={2} placeholder="Questions, sources, or things I want to remember…" onChange={(event) => onNote(event.target.value)} /></div>
        <div className={styles.contestFooter}><label className={styles.reviewedCheck}><input type="checkbox" checked={reviewed} onChange={(event) => onReviewed(event.target.checked)} /> I’ve reviewed this contest</label><span className={styles.small}>{allOfficial ? "Official source: " : "Source: "}{contest.sources.map((source) => source.name).join(", ") || "Not supplied"}</span></div>
      </div>
    </details>
  );
}
