import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import RollCallTable from "../RollCallTable";
import type { RollCallResult } from "@/lib/congress";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

afterEach(() => {
  cleanup();
  mockPush.mockClear();
});

const rollCall: RollCallResult = {
  chamber: "Senate",
  question: "On Passage of the Bill",
  date: "10-Feb-2026",
  votes: [
    { bioguideId: "S000001", name: "John Smith", party: "D", state: "CA", vote: "Yea" },
    { bioguideId: "D000001", name: "Jane Doe", party: "R", state: "TX", vote: "Nay" },
    { name: "No Id Member", party: "I", state: "VT", vote: "Not Voting" },
  ],
};

describe("RollCallTable", () => {
  it("renders all member names, parties, states, and votes", () => {
    render(<RollCallTable rollCall={rollCall} />);

    expect(screen.getByText("John Smith")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("No Id Member")).toBeInTheDocument();

    expect(screen.getAllByText("Democrat")).toHaveLength(1);
    expect(screen.getAllByText("Republican")).toHaveLength(1);
    expect(screen.getAllByText("Independent")).toHaveLength(1);
  });

  it("navigates to member profile when clicking a row with bioguideId", async () => {
    const user = userEvent.setup();
    render(<RollCallTable rollCall={rollCall} />);

    const smithRow = screen.getByText("John Smith").closest("tr")!;
    await user.click(smithRow);

    expect(mockPush).toHaveBeenCalledWith("/members/S000001");
  });

  it("does not navigate when clicking a row without bioguideId", async () => {
    const user = userEvent.setup();
    render(<RollCallTable rollCall={rollCall} />);

    const noIdRow = screen.getByText("No Id Member").closest("tr")!;
    await user.click(noIdRow);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows pointer cursor only on rows with bioguideId", () => {
    render(<RollCallTable rollCall={rollCall} />);

    const smithRow = screen.getByText("John Smith").closest("tr")!;
    const noIdRow = screen.getByText("No Id Member").closest("tr")!;

    expect(smithRow.className).toContain("cursor-pointer");
    expect(noIdRow.className).not.toContain("cursor-pointer");
  });

  it("displays chamber name and vote question in heading", () => {
    render(<RollCallTable rollCall={rollCall} />);

    expect(screen.getByText("Senate Vote")).toBeInTheDocument();
    expect(screen.getByText(/On Passage of the Bill/)).toBeInTheDocument();
  });

  it("shows correct vote counts in the Yea-Nay summary", () => {
    render(<RollCallTable rollCall={rollCall} />);

    // Yea count = 1, Nay count = 1
    const yeaSpan = screen.getByText("1", { selector: ".text-emerald-400" });
    const naySpan = screen.getByText("1", { selector: ".text-red-400" });
    expect(yeaSpan).toBeInTheDocument();
    expect(naySpan).toBeInTheDocument();
  });

  it("filters members when a vote filter is clicked", async () => {
    const user = userEvent.setup();
    render(<RollCallTable rollCall={rollCall} />);

    // Click "Nay" filter
    const nayButton = screen.getByRole("button", { name: /Nay/ });
    await user.click(nayButton);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("John Smith")).not.toBeInTheDocument();
    expect(screen.queryByText("No Id Member")).not.toBeInTheDocument();
  });
});
