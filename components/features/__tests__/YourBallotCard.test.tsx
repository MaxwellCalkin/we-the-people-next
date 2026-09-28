import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import YourBallotCard from "../YourBallotCard";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(cleanup);

describe("YourBallotCard", () => {
  it("shows the voter's state and congressional district", () => {
    render(
      <YourBallotCard
        state="CA"
        district="12"
        hasSenateRace={false}
        stateDates={[]}
        houseIncumbent={null}
      />
    );

    expect(screen.getByText(/^California/)).toHaveTextContent(
      /^California · Congressional District 12$/
    );
  });

  it("shows just the state for an at-large district (0), with no stray 0", () => {
    render(
      <YourBallotCard
        state="VT"
        district="0"
        hasSenateRace={false}
        stateDates={[]}
        houseIncumbent={null}
      />
    );

    expect(screen.getByText(/^Vermont/)).toHaveTextContent(/^Vermont$/);
  });
});
