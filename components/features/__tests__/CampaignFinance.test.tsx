import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import CampaignFinance from "../CampaignFinance";
import type { CandidateTotals, ContributorAggregate } from "@/lib/fec";

afterEach(cleanup);

const totals: CandidateTotals = {
  candidateId: "S8WA00194",
  cycle: 2026,
  receipts: 5_000_000,
  disbursements: 3_200_000,
  cashOnHand: 1_800_000,
  individualContributions: 4_100_000,
  pacContributions: 850_000,
  coverageEndDate: "2026-03-31",
};

const individuals: ContributorAggregate[] = [
  { contributor: "SMITH, JOHN", amount: 6600 },
  { contributor: "DOE, JANE", amount: 3300 },
];

const pacs: ContributorAggregate[] = [
  { contributor: "BIG INDUSTRY PAC", amount: 5000 },
];

describe("CampaignFinance", () => {
  it("renders cycle label, totals, and contributor lists", () => {
    render(
      <CampaignFinance
        cycle={2026}
        totals={totals}
        topIndividuals={individuals}
        topPacs={pacs}
        opensecretsId="N00007836"
        memberName="Maria Cantwell"
      />
    );

    expect(screen.getByText("Campaign Finance")).toBeInTheDocument();
    expect(screen.getByText("Cycle 2025–2026")).toBeInTheDocument();

    // Currency formatting (no cents)
    expect(screen.getByText("$5,000,000")).toBeInTheDocument(); // receipts
    expect(screen.getByText("$1,800,000")).toBeInTheDocument(); // cash on hand
    expect(screen.getByText("$850,000")).toBeInTheDocument();   // PAC

    // Contributor names
    expect(screen.getByText("SMITH, JOHN")).toBeInTheDocument();
    expect(screen.getByText("BIG INDUSTRY PAC")).toBeInTheDocument();

    // OpenSecrets deep link includes the cid
    const link = screen.getByRole("link", { name: /OpenSecrets/i });
    expect(link).toHaveAttribute(
      "href",
      "https://www.opensecrets.org/members-of-congress/summary?cid=N00007836"
    );
  });

  it("hides the entire section when there is nothing to show", () => {
    const { container } = render(
      <CampaignFinance
        cycle={2026}
        totals={null}
        topIndividuals={[]}
        topPacs={[]}
        memberName="Nobody"
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders OpenSecrets link even with no FEC data, when crosswalk has the id", () => {
    render(
      <CampaignFinance
        cycle={2026}
        totals={null}
        topIndividuals={[]}
        topPacs={[]}
        opensecretsId="N00099999"
        memberName="Test Person"
      />
    );

    expect(screen.getByText("Campaign Finance")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /OpenSecrets/i })
    ).toBeInTheDocument();
    // No-data placeholders should appear in both contributor columns
    expect(screen.getAllByText("No data available.")).toHaveLength(2);
  });

  it("shows 'No data available' for an empty contributor list when totals exist", () => {
    render(
      <CampaignFinance
        cycle={2026}
        totals={totals}
        topIndividuals={[]}
        topPacs={pacs}
        memberName="Test"
      />
    );
    expect(screen.getByText("No data available.")).toBeInTheDocument();
    expect(screen.getByText("BIG INDUSTRY PAC")).toBeInTheDocument();
  });
});
