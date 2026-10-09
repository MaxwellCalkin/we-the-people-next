import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import VoteForm from "../VoteForm";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  replace.mockClear();
  refresh.mockClear();
});

function renderForm() {
  return render(<VoteForm billSlug="hr725" congress="119" title="Crow Revenue Act" summary="" />);
}

describe("VoteForm", () => {
  it("won't submit until the voter picks Yea or Nay", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderForm();

    const submit = screen.getByRole("button", { name: "Choose Yea or Nay" });
    expect(submit).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("casts the chosen vote and moves to the results page", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    renderForm();

    await user.click(screen.getByRole("radio", { name: /Nay/ }));
    await user.click(screen.getByRole("button", { name: "Cast my Nay vote" }));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/vote");
    expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({
      action: "nay",
      billSlug: "hr725",
      congress: "119",
    });
    expect(replace).toHaveBeenCalledWith("/vote/hr725/119/voted");
  });

  it("treats an already-recorded vote as done instead of showing an error", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "Already voted" }), { status: 409 }));
    renderForm();

    await user.click(screen.getByRole("radio", { name: /Yea/ }));
    await user.click(screen.getByRole("button", { name: "Cast my Yea vote" }));

    expect(replace).toHaveBeenCalledWith("/vote/hr725/119/voted");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains a failed vote and lets the voter try again", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "boom" }), { status: 500 }));
    renderForm();

    await user.click(screen.getByRole("radio", { name: /Yea/ }));
    await user.click(screen.getByRole("button", { name: "Cast my Yea vote" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Your vote didn't go through. Please try again.");
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cast my Yea vote" })).toBeEnabled();
  });

  it("asks the voter to log in again when the session has expired", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }));
    renderForm();

    await user.click(screen.getByRole("radio", { name: /Yea/ }));
    await user.click(screen.getByRole("button", { name: "Cast my Yea vote" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Your session expired. Log in again to vote.");
  });
});
