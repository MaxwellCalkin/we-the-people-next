import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exampleBallot } from "@/lib/ballot-demo";
import { preparationStorageKey } from "@/lib/ballot-preparation";
import type { BallotData } from "@/lib/ballot-types";
import BallotWorkspace from "./BallotWorkspace";

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

function contestCard(title: string) {
  const heading = screen.getByText(title, { selector: "summary h3" });
  const card = heading.closest("details");
  if (!card) throw new Error(`No contest card for ${title}`);
  return { card, queries: within(card), heading };
}

function showBallot(ballot = exampleBallot) {
  return render(<BallotWorkspace ballot={ballot} onChangeLocation={vi.fn()} />);
}

describe("BallotWorkspace", () => {
  it("allows one House choice, replaces it, and lets the voter remain undecided", async () => {
    const user = userEvent.setup();
    showBallot();
    const { queries } = contestCard("U.S. House of Representatives");
    const alex = queries.getByRole("radio", { name: /Alex Morgan/ });
    const jordan = queries.getByRole("radio", { name: /Jordan Rivera/ });
    const undecided = queries.getByRole("radio", { name: /Still deciding/ });

    expect(undecided).toBeChecked();
    await user.click(alex);
    expect(alex).toBeChecked();
    await user.click(jordan);
    expect(jordan).toBeChecked();
    expect(alex).not.toBeChecked();
    await user.click(undecided);
    expect(jordan).not.toBeChecked();
    expect(undecided).toBeChecked();
  });

  it("limits a two-seat school board contest and makes room when a choice is removed", async () => {
    const user = userEvent.setup();
    showBallot();
    const { queries, heading } = contestCard("School board");
    await user.click(heading);
    const avery = queries.getByRole("checkbox", { name: /Avery Patel/ });
    const riley = queries.getByRole("checkbox", { name: /Riley Brooks/ });
    const quinn = queries.getByRole("checkbox", { name: /Quinn Lee/ });

    await user.click(avery);
    await user.click(riley);
    expect(quinn).toBeDisabled();
    await user.click(quinn);
    expect(quinn).not.toBeChecked();
    expect(queries.getByText("2 of 2 possible choices noted.")).toBeInTheDocument();
    await user.click(avery);
    expect(quinn).toBeEnabled();
    await user.click(quinn);
    expect(riley).toBeChecked();
    expect(quinn).toBeChecked();
    expect(avery).not.toBeChecked();
  });

  it("tracks reviewed contests separately from choices and carries research notes into review", async () => {
    const user = userEvent.setup();
    showBallot();
    const { queries } = contestCard("U.S. House of Representatives");
    await user.type(queries.getByRole("textbox", { name: "My research notes" }), "Read each candidate's education plan.");
    await user.click(queries.getByRole("checkbox", { name: "I’ve reviewed this contest" }));
    expect(screen.getByRole("progressbar", { name: "Contests reviewed" })).toHaveAttribute("value", "1");
    expect(screen.getByRole("progressbar", { name: "Contests reviewed" })).toHaveAttribute("max", "5");

    await user.click(screen.getByRole("checkbox", { name: "Still to review" }));
    expect(screen.queryByText("U.S. House of Representatives", { selector: "summary h3" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review choices" }));
    expect(screen.getByRole("heading", { name: "Your preparation at a glance" })).toBeInTheDocument();
    expect(screen.getAllByText("Read each candidate's education plan.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Still deciding / no choice noted").length).toBeGreaterThan(0);
  });

  it("saves only with consent, restores after another opt-in, and removes the saved copy when unchecked", async () => {
    const user = userEvent.setup();
    const firstVisit = showBallot();
    const { queries } = contestCard("U.S. House of Representatives");
    await user.click(queries.getByRole("radio", { name: /Alex Morgan/ }));
    await user.type(queries.getByRole("textbox", { name: "My research notes" }), "Compare statements before election day.");
    expect(localStorage.length).toBe(0);

    await user.click(screen.getByRole("checkbox", { name: "Save notes on this device" }));
    const key = preparationStorageKey(exampleBallot.id);
    expect(localStorage.getItem(key)).toContain("Compare statements before election day.");
    expect(localStorage.getItem(key)).not.toContain(exampleBallot.normalizedAddress);
    firstVisit.unmount();

    showBallot();
    const restoredCard = contestCard("U.S. House of Representatives").queries;
    expect(restoredCard.getByRole("textbox", { name: "My research notes" })).toHaveValue("");
    await user.click(screen.getByRole("checkbox", { name: "Save notes on this device" }));
    expect(restoredCard.getByRole("radio", { name: /Alex Morgan/ })).toBeChecked();
    expect(restoredCard.getByRole("textbox", { name: "My research notes" })).toHaveValue("Compare statements before election day.");
    await user.click(screen.getByRole("checkbox", { name: "Save notes on this device" }));
    expect(localStorage.getItem(key)).toBeNull();
    expect(restoredCard.getByRole("textbox", { name: "My research notes" })).toHaveValue("Compare statements before election day.");
    expect(screen.getByRole("status")).toHaveTextContent("Saved copy removed");
  });

  it("keeps preparation for a shared contest separate across primary ballots", async () => {
    const user = userEvent.setup();
    const ballot: BallotData = {
      ...exampleBallot,
      id: "example-primary-election",
      contests: [
        exampleBallot.contests[2],
        { ...exampleBallot.contests[0], id: "primary-a-house", primaryParty: "Example Party A" },
        { ...exampleBallot.contests[1], id: "primary-b-state-house", primaryParty: "Example Party B" },
      ],
    };
    showBallot(ballot);
    const partyPicker = screen.getByRole("combobox", { name: "Which primary ballot are you preparing for?" });
    expect(screen.queryByRole("button", { name: "Print my preparation" })).not.toBeInTheDocument();
    await user.selectOptions(partyPicker, "Example Party A");
    const partyA = contestCard("School board").queries;
    await user.click(partyA.getByRole("checkbox", { name: /Avery Patel/ }));
    await user.type(partyA.getByRole("textbox", { name: "My research notes" }), "Notes for the A ballot.");
    await user.click(screen.getByRole("checkbox", { name: "Save notes on this device" }));

    await user.selectOptions(partyPicker, "Example Party B");
    const partyB = contestCard("School board").queries;
    expect(partyB.getByRole("checkbox", { name: /Avery Patel/ })).not.toBeChecked();
    expect(partyB.getByRole("textbox", { name: "My research notes" })).toHaveValue("");
    await user.click(partyB.getByRole("checkbox", { name: /Riley Brooks/ }));
    await user.type(partyB.getByRole("textbox", { name: "My research notes" }), "Notes for the B ballot.");
    await user.click(screen.getByRole("checkbox", { name: "Save notes on this device" }));

    await user.selectOptions(partyPicker, "Example Party A");
    expect(screen.getByRole("checkbox", { name: "Save notes on this device" })).toBeChecked();
    const returningA = contestCard("School board").queries;
    expect(returningA.getByRole("checkbox", { name: /Avery Patel/ })).toBeChecked();
    expect(returningA.getByRole("checkbox", { name: /Riley Brooks/ })).not.toBeChecked();
    expect(returningA.getByRole("textbox", { name: "My research notes" })).toHaveValue("Notes for the A ballot.");
  });

  it("keeps unsaved choices and notes when switching to another primary ballot and back", async () => {
    const user = userEvent.setup();
    const ballot: BallotData = {
      ...exampleBallot,
      id: "example-primary-unsaved",
      contests: [
        exampleBallot.contests[2],
        { ...exampleBallot.contests[0], id: "primary-a-house", primaryParty: "Example Party A" },
        { ...exampleBallot.contests[1], id: "primary-b-state-house", primaryParty: "Example Party B" },
      ],
    };
    showBallot(ballot);
    const partyPicker = screen.getByRole("combobox", { name: "Which primary ballot are you preparing for?" });
    await user.selectOptions(partyPicker, "Example Party A");
    const partyA = contestCard("School board").queries;
    await user.click(partyA.getByRole("checkbox", { name: /Avery Patel/ }));
    await user.type(partyA.getByRole("textbox", { name: "My research notes" }), "Still comparing these two.");
    await user.click(partyA.getByRole("checkbox", { name: "I’ve reviewed this contest" }));
    expect(screen.getByRole("checkbox", { name: "Save notes on this device" })).not.toBeChecked();

    await user.selectOptions(partyPicker, "Example Party B");
    await user.selectOptions(partyPicker, "Example Party A");

    const returning = contestCard("School board").queries;
    expect(returning.getByRole("checkbox", { name: /Avery Patel/ })).toBeChecked();
    expect(returning.getByRole("textbox", { name: "My research notes" })).toHaveValue("Still comparing these two.");
    expect(returning.getByRole("checkbox", { name: "I’ve reviewed this contest" })).toBeChecked();
    expect(localStorage.length).toBe(0);
  });

  it.each(["choice", "note"] as const)("preserves a fresh %s instead of replacing it with a previously saved preparation", async (edit) => {
    const user = userEvent.setup();
    const house = exampleBallot.contests[0];
    localStorage.setItem(preparationStorageKey(exampleBallot.id), JSON.stringify({
      choices: { [house.id]: [house.candidates[0].id] },
      notes: { [house.id]: "Old preparation from a previous visit." },
      reviewed: [house.id],
    }));
    const visit = showBallot();
    const fresh = contestCard("U.S. House of Representatives").queries;
    if (edit === "choice") await user.click(fresh.getByRole("radio", { name: /Jordan Rivera/ }));
    else await user.type(fresh.getByRole("textbox", { name: "My research notes" }), "New questions from this visit.");

    await user.click(screen.getByRole("checkbox", { name: "Save notes on this device" }));
    expect(fresh.getByRole("radio", { name: /Alex Morgan/ })).not.toBeChecked();
    expect(fresh.getByRole("radio", { name: edit === "choice" ? /Jordan Rivera/ : /Still deciding/ })).toBeChecked();
    expect(fresh.getByRole("textbox", { name: "My research notes" })).toHaveValue(edit === "note" ? "New questions from this visit." : "");
    expect(fresh.getByRole("checkbox", { name: "I’ve reviewed this contest" })).not.toBeChecked();
    visit.unmount();

    showBallot();
    await user.click(screen.getByRole("checkbox", { name: "Save notes on this device" }));
    const nextVisit = contestCard("U.S. House of Representatives").queries;
    expect(nextVisit.getByRole("radio", { name: edit === "choice" ? /Jordan Rivera/ : /Still deciding/ })).toBeChecked();
    expect(nextVisit.getByRole("textbox", { name: "My research notes" })).toHaveValue(edit === "note" ? "New questions from this visit." : "");
  });

  it("offers shared contests without a party selection and keeps that preparation separate", async () => {
    const user = userEvent.setup();
    const ballot: BallotData = {
      ...exampleBallot,
      id: "example-primary-with-shared-contests",
      contests: [
        exampleBallot.contests[2],
        { ...exampleBallot.contests[0], id: "primary-a-house", primaryParty: "Example Party A" },
        { ...exampleBallot.contests[1], id: "primary-b-state-house", primaryParty: "Example Party B" },
      ],
    };
    showBallot(ballot);
    const partyPicker = screen.getByRole("combobox", { name: "Which primary ballot are you preparing for?" });
    await user.selectOptions(partyPicker, screen.getByRole("option", { name: "Nonpartisan contests only" }));
    expect(screen.queryByText("U.S. House of Representatives", { selector: "summary h3" })).not.toBeInTheDocument();
    expect(screen.queryByText("State representative", { selector: "summary h3" })).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Contests reviewed" })).toHaveAttribute("max", "1");
    const shared = contestCard("School board").queries;
    await user.click(shared.getByRole("checkbox", { name: /Avery Patel/ }));
    await user.type(shared.getByRole("textbox", { name: "My research notes" }), "Notes for nonpartisan contests.");
    await user.click(screen.getByRole("checkbox", { name: "Save notes on this device" }));

    await user.selectOptions(partyPicker, "Example Party A");
    const partisan = contestCard("School board").queries;
    expect(partisan.getByRole("checkbox", { name: /Avery Patel/ })).not.toBeChecked();
    expect(partisan.getByRole("textbox", { name: "My research notes" })).toHaveValue("");
    expect(screen.getByText("U.S. House of Representatives", { selector: "summary h3" })).toBeInTheDocument();
    await user.click(partisan.getByRole("checkbox", { name: /Riley Brooks/ }));
    await user.click(screen.getByRole("checkbox", { name: "Save notes on this device" }));

    await user.selectOptions(partyPicker, screen.getByRole("option", { name: "Nonpartisan contests only" }));
    expect(screen.getByRole("checkbox", { name: "Save notes on this device" })).toBeChecked();
    const returning = contestCard("School board").queries;
    expect(returning.getByRole("checkbox", { name: /Avery Patel/ })).toBeChecked();
    expect(returning.getByRole("checkbox", { name: /Riley Brooks/ })).not.toBeChecked();
    expect(returning.getByRole("textbox", { name: "My research notes" })).toHaveValue("Notes for nonpartisan contests.");
  });

  it("keeps the fictional warning while reviewing and prints an explicitly unofficial preparation sheet", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    showBallot();
    expect(screen.getByText("Fictional example — not your actual ballot")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Review choices" }));
    expect(screen.getByText("Fictional example — not your actual ballot")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Print my preparation" }));
    expect(print).toHaveBeenCalledOnce();
    const sheet = screen.getByRole("region", { name: "Printable preparation sheet" });
    expect(within(sheet).getByText("FICTIONAL EXAMPLE — NOT YOUR BALLOT")).toBeInTheDocument();
    expect(within(sheet).getByText(/No vote has been cast/)).toBeInTheDocument();
  });
});
