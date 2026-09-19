import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exampleBallot } from "@/lib/ballot-demo";
import type { BallotData, BallotElection } from "@/lib/ballot-types";
import BallotExplorer from "./BallotExplorer";

const fetchMock = vi.fn<typeof fetch>();
const votingAddress = "100 Sample Avenue, Example City, PA 19000";
const availableBallot: BallotData = {
  ...exampleBallot,
  id: "matched-test-ballot",
  coverage: "partial",
  normalizedAddress: votingAddress,
};

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("BallotExplorer", () => {
  it("sends the address in a POST and requires address confirmation before opening preparation", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(response({ status: "ready", elections: [] }))
      .mockResolvedValueOnce(response({ status: "ready", ballot: availableBallot }));
    render(<BallotExplorer lookupConfigured />);

    await user.type(screen.getByRole("textbox", { name: "Registered voting address" }), `  ${votingAddress}  `);
    await user.click(screen.getByRole("button", { name: "Find my ballot" }));

    expect(fetchMock).toHaveBeenLastCalledWith("/api/ballot", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ address: votingAddress }),
    }));
    const confirmation = await screen.findByRole("heading", { name: "Is this your voting address?" });
    expect(confirmation).toHaveFocus();
    expect(screen.getByText(votingAddress)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "My ballot preparation" })).not.toBeInTheDocument();
    expect(localStorage.length).toBe(0);

    await user.click(screen.getByRole("button", { name: "Yes, view this ballot" }));
    expect(screen.getByRole("region", { name: "My ballot preparation" })).toBeInTheDocument();
    expect(screen.getByText("Available ballot information · Completeness not confirmed")).toBeInTheDocument();
    expect(localStorage.length).toBe(0);
  });

  it("offers the clearly fictional development example when address lookup is not configured", async () => {
    const user = userEvent.setup();
    render(<BallotExplorer lookupConfigured={false} example={exampleBallot} />);

    expect(screen.getByRole("textbox", { name: "Registered voting address" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Find my ballot" })).toBeDisabled();
    expect(screen.getByText(/Address lookup isn’t available yet/)).toBeInTheDocument();
    expect(screen.getByText(/Fictional candidates and questions/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Explore an example ballot" }));

    expect(screen.getByRole("region", { name: "My ballot preparation" })).toBeInTheDocument();
    expect(screen.getByText("Fictional example — not your actual ballot")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Back to ballot lookup" }));
    expect(screen.getByRole("heading", { name: "What’s on my ballot?" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows an upstream unavailable message and official fallback without implying an empty ballot", async () => {
    const user = userEvent.setup();
    const message = "Ballot information is temporarily unavailable. Please check with your election office.";
    fetchMock
      .mockResolvedValueOnce(response({ status: "ready", elections: [] }))
      .mockResolvedValueOnce(response({ status: "unavailable", message }, 503));
    render(<BallotExplorer lookupConfigured />);
    await user.type(screen.getByRole("textbox", { name: "Registered voting address" }), votingAddress);
    await user.click(screen.getByRole("button", { name: "Find my ballot" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(message);
    expect(within(alert).getByRole("link", { name: /Find my election office/ }))
      .toHaveAttribute("href", "https://www.usa.gov/election-office");
    expect(screen.queryByRole("region", { name: "My ballot preparation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Is this your voting address?" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Find my ballot" })).toBeEnabled();
  });

  it("keeps the form usable after a network failure", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(response({ status: "ready", elections: [] }))
      .mockRejectedValueOnce(new TypeError("Network request failed"));
    render(<BallotExplorer lookupConfigured />);
    await user.type(screen.getByRole("textbox", { name: "Registered voting address" }), votingAddress);
    await user.click(screen.getByRole("button", { name: "Find my ballot" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The ballot lookup could not be reached.");
    expect(screen.getByRole("textbox", { name: "Registered voting address" })).toHaveValue(votingAddress);
    expect(screen.getByRole("button", { name: "Find my ballot" })).toBeEnabled();
    expect(screen.queryByRole("region", { name: "My ballot preparation" })).not.toBeInTheDocument();
  });

  it("cancels the initial election list so a late national response cannot replace address-specific choices", async () => {
    const user = userEvent.setup();
    const initialList = deferred<Response>();
    const localElection: BallotElection = { id: "local-123", name: "Address-specific special election", date: "2026-10-06" };
    const nationalElection: BallotElection = { id: "national-456", name: "Unrelated national election", date: "2026-11-03" };
    let initialSignal: AbortSignal | null | undefined;
    fetchMock
      .mockImplementationOnce((_url, options) => {
        initialSignal = options?.signal;
        return initialList.promise;
      })
      .mockResolvedValueOnce(response({
        status: "election_required",
        message: "Choose an election available for this address.",
        elections: [localElection],
      }))
      .mockResolvedValueOnce(response({ status: "ready", ballot: availableBallot }));
    render(<BallotExplorer lookupConfigured />);

    await user.type(screen.getByRole("textbox", { name: "Registered voting address" }), votingAddress);
    await user.click(screen.getByRole("button", { name: "Find my ballot" }));
    const choices = await screen.findByRole("combobox", { name: "Election" });
    expect(initialSignal?.aborted).toBe(true);
    expect(within(choices).getByRole("option", { name: /Address-specific special election/ })).toBeInTheDocument();

    // Intentionally let the mocked response finish despite cancellation: stale
    // responses must also be ignored when a transport cannot stop in time.
    await act(async () => {
      initialList.resolve(response({ status: "ready", elections: [nationalElection] }));
    });
    expect(within(choices).queryByRole("option", { name: /Unrelated national election/ })).not.toBeInTheDocument();
    expect(within(choices).getByRole("option", { name: /Address-specific special election/ })).toBeInTheDocument();

    await user.selectOptions(choices, localElection.id);
    await user.click(screen.getByRole("button", { name: "Find my ballot" }));
    expect(fetchMock).toHaveBeenLastCalledWith("/api/ballot", expect.objectContaining({
      body: JSON.stringify({ address: votingAddress, electionId: localElection.id }),
    }));
    expect(await screen.findByRole("heading", { name: "Is this your voting address?" })).toBeInTheDocument();
  });
});
