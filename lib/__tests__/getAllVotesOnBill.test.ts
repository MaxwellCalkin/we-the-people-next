import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAllVotesOnBill } from "../congress";

// Mock global fetch — these are external APIs (Congress.gov, senate.gov, clerk.house.gov), not our DB
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Provide a dummy API key so the URL construction works
vi.stubEnv("CONGRESS_KEY", "test-key");

beforeEach(() => {
  mockFetch.mockReset();
});

// ── Helpers ──────────────────────────────────────────────

function actionsResponse(actions: unknown[]) {
  return {
    ok: true,
    json: async () => ({ actions }),
  };
}

function xmlResponse(xml: string) {
  return {
    ok: true,
    text: async () => xml,
  };
}

const SENATE_XML = `
<roll_call_vote>
  <vote_question_text>On Passage of the Bill</vote_question_text>
  <vote_date>10-Feb-2026</vote_date>
  <members>
    <member>
      <first_name>John</first_name>
      <last_name>Smith</last_name>
      <party>D</party>
      <state>CA</state>
      <lis_member_id>S001</lis_member_id>
      <bioguide_id>S000001</bioguide_id>
      <vote_cast>Yea</vote_cast>
    </member>
    <member>
      <first_name>Jane</first_name>
      <last_name>Doe</last_name>
      <party>R</party>
      <state>TX</state>
      <lis_member_id>S002</lis_member_id>
      <bioguide_id>D000001</bioguide_id>
      <vote_cast>Nay</vote_cast>
    </member>
  </members>
</roll_call_vote>
`;

const HOUSE_XML = `
<rollcall-vote>
  <vote-metadata>
    <vote-question>On Motion to Suspend the Rules and Pass</vote-question>
    <action-date date="03/17/2026">17-Mar-2026</action-date>
  </vote-metadata>
  <vote-data>
    <recorded-vote>
      <legislator name-id="A000055" sort-field="Aderholt" party="R" state="AL" role="legislator">Aderholt</legislator>
      <vote>Aye</vote>
    </recorded-vote>
    <recorded-vote>
      <legislator name-id="B000574" party="D" state="OR" role="legislator" sort-field="Blumenauer">Blumenauer</legislator>
      <vote>No</vote>
    </recorded-vote>
    <recorded-vote>
      <legislator name-id="C000984" party="D" state="MD" role="legislator" sort-field="Cummings">Cummings</legislator>
      <vote>Not Voting</vote>
    </recorded-vote>
  </vote-data>
</rollcall-vote>
`;

// ── Tests ────────────────────────────────────────────────

describe("getAllVotesOnBill", () => {
  it("parses Senate XML and extracts bioguideId for each member", async () => {
    mockFetch
      .mockResolvedValueOnce(actionsResponse([
        { recordedVotes: [{ url: "https://www.senate.gov/vote123.xml" }] },
      ]))
      .mockResolvedValueOnce(xmlResponse(SENATE_XML));

    const result = await getAllVotesOnBill("119", "s", "100");

    expect(result.type).toBe("roll_call");
    if (result.type !== "roll_call") return;

    expect(result.results).toHaveLength(1);
    const senate = result.results[0];
    expect(senate.chamber).toBe("Senate");
    expect(senate.question).toBe("On Passage of the Bill");
    expect(senate.date).toBe("10-Feb-2026");
    expect(senate.votes).toHaveLength(2);

    expect(senate.votes[0]).toEqual({
      bioguideId: "S000001",
      name: "John Smith",
      party: "D",
      state: "CA",
      vote: "Yea",
    });
    expect(senate.votes[1]).toEqual({
      bioguideId: "D000001",
      name: "Jane Doe",
      party: "R",
      state: "TX",
      vote: "Nay",
    });
  });

  it("parses House XML, extracts name-id as bioguideId, and normalizes Aye/No", async () => {
    mockFetch
      .mockResolvedValueOnce(actionsResponse([
        { recordedVotes: [{ url: "https://clerk.house.gov/evs/2026/roll089.xml" }] },
      ]))
      .mockResolvedValueOnce(xmlResponse(HOUSE_XML));

    const result = await getAllVotesOnBill("119", "hr", "200");

    expect(result.type).toBe("roll_call");
    if (result.type !== "roll_call") return;

    const house = result.results[0];
    expect(house.chamber).toBe("House");
    expect(house.votes).toHaveLength(3);

    expect(house.votes[0]).toEqual({
      bioguideId: "A000055",
      name: "Aderholt",
      party: "R",
      state: "AL",
      vote: "Yea", // Aye → Yea
    });
    expect(house.votes[1]).toEqual({
      bioguideId: "B000574",
      name: "Blumenauer",
      party: "D",
      state: "OR",
      vote: "Nay", // No → Nay
    });
    expect(house.votes[2].vote).toBe("Not Voting");
  });

  it("deduplicates identical roll call URLs across actions", async () => {
    const sameUrl = "https://clerk.house.gov/evs/2026/roll089.xml";
    mockFetch
      .mockResolvedValueOnce(actionsResponse([
        { recordedVotes: [{ url: sameUrl }] },
        { recordedVotes: [{ url: sameUrl }] },
      ]))
      .mockResolvedValueOnce(xmlResponse(HOUSE_XML));

    const result = await getAllVotesOnBill("119", "hr", "200");

    expect(result.type).toBe("roll_call");
    if (result.type !== "roll_call") return;

    // Should produce one table, not two
    expect(result.results).toHaveLength(1);
    // fetch called twice: once for actions API, once for the (deduplicated) XML
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("reports chamber status when Senate passed by unanimous consent but House had a roll call", async () => {
    mockFetch
      .mockResolvedValueOnce(actionsResponse([
        {
          recordedVotes: [{ url: "https://clerk.house.gov/evs/2026/roll089.xml" }],
        },
        {
          text: "Passed Senate by Unanimous Consent.",
          sourceSystem: { name: "Senate" },
        },
      ]))
      .mockResolvedValueOnce(xmlResponse(HOUSE_XML));

    const result = await getAllVotesOnBill("119", "s", "3971");

    expect(result.type).toBe("roll_call");
    if (result.type !== "roll_call") return;

    expect(result.results).toHaveLength(1);
    expect(result.results[0].chamber).toBe("House");

    expect(result.chamberStatuses).toEqual([
      { chamber: "Senate", status: "Passed by Unanimous Consent" },
    ]);
  });

  it("reports chamber status when House passed by voice vote but Senate had a roll call", async () => {
    mockFetch
      .mockResolvedValueOnce(actionsResponse([
        {
          recordedVotes: [{ url: "https://www.senate.gov/vote456.xml" }],
        },
        {
          text: "On motion to suspend the rules and pass the bill Agreed to by voice vote.",
          sourceSystem: { name: "House of Representatives" },
        },
      ]))
      .mockResolvedValueOnce(xmlResponse(SENATE_XML));

    const result = await getAllVotesOnBill("119", "hr", "500");

    expect(result.type).toBe("roll_call");
    if (result.type !== "roll_call") return;

    expect(result.results).toHaveLength(1);
    expect(result.results[0].chamber).toBe("Senate");

    expect(result.chamberStatuses).toEqual([
      { chamber: "House", status: "Passed by Voice Vote" },
    ]);
  });

  it("returns special status when no roll calls exist and passed by unanimous consent", async () => {
    mockFetch.mockResolvedValueOnce(actionsResponse([
      {
        text: "Passed by Unanimous Consent.",
        sourceSystem: { name: "Senate" },
      },
    ]));

    const result = await getAllVotesOnBill("119", "s", "50");

    expect(result.type).toBe("special");
    if (result.type !== "special") return;
    expect(result.status).toBe("Passed by Unanimous Consent");
  });

  it("returns special status when no actions have any votes", async () => {
    mockFetch.mockResolvedValueOnce(actionsResponse([
      { text: "Introduced in Senate." },
      { text: "Read twice and referred to committee." },
    ]));

    const result = await getAllVotesOnBill("119", "s", "999");

    expect(result.type).toBe("special");
    if (result.type !== "special") return;
    expect(result.status).toBe("No recorded vote found");
  });

  it("does not include chamberStatuses when both chambers have roll calls", async () => {
    const senateUrl = "https://www.senate.gov/vote789.xml";
    const houseUrl = "https://clerk.house.gov/evs/2026/roll100.xml";

    mockFetch
      .mockResolvedValueOnce(actionsResponse([
        { recordedVotes: [{ url: senateUrl }, { url: houseUrl }] },
      ]))
      .mockResolvedValueOnce(xmlResponse(SENATE_XML))
      .mockResolvedValueOnce(xmlResponse(HOUSE_XML));

    const result = await getAllVotesOnBill("119", "s", "300");

    expect(result.type).toBe("roll_call");
    if (result.type !== "roll_call") return;

    expect(result.results).toHaveLength(2);
    expect(result.chamberStatuses).toBeUndefined();
  });
});
