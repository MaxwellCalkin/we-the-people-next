// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBallotElections, lookupBallot, normalizeBallot } from "@/lib/ballot-provider";

const now = new Date("2026-09-18T12:00:00Z");
const address = "123 Example Street, Sample City, PA 17000";
const election = { id: "9999", name: "Example election", electionDay: "2026-11-03" };
const fixture = {
  election,
  normalizedInput: { line1: "123 Example Street", city: "Sample City", state: "PA", zip: "17000" },
  contests: [{ office: "Mayor", level: ["locality"], numberVotingFor: "1", candidates: [{ name: "Example Person" }] }],
};
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("GOOGLE_CIVIC_API_KEY", "test-key");
  vi.stubEnv("GOOGLE_KEY", "");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function mockResponse(data: unknown, status = 200) {
  fetchMock.mockImplementation(async () => new Response(JSON.stringify(data), { status }));
}

describe("ballot normalization", () => {
  it("uses ballot placements, includes all levels, and never asserts a complete ballot", () => {
    const ballot = normalizeBallot({
      ...fixture,
      contests: [
        { office: "School board", level: ["special"], ballotPlacement: 2, numberVotingFor: "3", candidates: [{ name: "Third", orderOnBallot: 2 }, { name: "First", orderOnBallot: 0 }] },
        { office: "U.S. Senate", level: ["country"], ballotPlacement: 0 },
        { office: "Governor", level: ["administrativeArea1"], ballotPlacement: 1 },
      ],
    }, address, now)!;
    expect(ballot.coverage).toBe("partial");
    expect(ballot.contests.map((item) => item.title)).toEqual(["U.S. Senate", "Governor", "School board"]);
    expect(ballot.contests.map((item) => item.level)).toEqual(["Federal", "State", "Local"]);
    expect(ballot.contests[2].voteFor).toBe(3);
    expect(ballot.contests[2].candidates.map((item) => item.name)).toEqual(["First", "Third"]);
    expect(ballot.contests[0].voteFor).toBeNull();
    expect(ballot.checkedAt).toBe(now.toISOString());
  });

  it("preserves provider order without complete ballot positions and does not use finance rankings", () => {
    const ballot = normalizeBallot({ ...fixture, contests: [
      { office: "Z office", ballotPlacement: 9, candidates: [{ name: "Z person", total_receipts: 1 }, { name: "A person", orderOnBallot: 1, total_receipts: 1000 }] },
      { office: "A office" },
    ] }, address, now)!;
    expect(ballot.contests.map((item) => item.title)).toEqual(["Z office", "A office"]);
    expect(ballot.contests[0].candidates.map((item) => item.name)).toEqual(["Z person", "A person"]);
  });

  it("keeps official measure text and responses without turning advocacy into yes/no explanations", () => {
    const ballot = normalizeBallot({ ...fixture, contests: [{
      type: "Referendum", referendumTitle: "Question 1", referendumText: "Official question text.",
      referendumBrief: "Official brief.", referendumProStatement: "Argument for.", referendumConStatement: "Argument against.",
      referendumBallotResponses: ["For the measure", "Against the measure"], numberVotingFor: "1",
      referendumUrl: "https://example.gov/question", sources: [{ name: "Example election office", official: true }],
    }] }, address, now)!;
    expect(ballot.contests[0]).toMatchObject({ kind: "measure", level: "Ballot questions", title: "Question 1", voteFor: 1,
      measure: { text: "Official question text.", summary: "Official brief.", responses: ["For the measure", "Against the measure"] },
      sources: [{ name: "Example election office", official: true }],
    });
    expect(ballot.contests[0].measure?.yesMeaning).toBeUndefined();
    expect(ballot.contests[0].measure?.noMeaning).toBeUndefined();
  });

  it("preserves full measure wording, summaries, responses and eligibility instructions", () => {
    const text = `${"Official wording. ".repeat(2000)}Final legal provision.`;
    const summary = `${"Official summary. ".repeat(500)}Summary ending.`;
    const eligibility = `${"Eligibility condition. ".repeat(250)}Final condition.`;
    const response = `${"Response wording. ".repeat(100)}Response ending.`;
    const ballot = normalizeBallot({ ...fixture, contests: [{
      type: "Referendum", referendumTitle: "Question 1", referendumText: text,
      referendumBrief: summary, electorateSpecifications: eligibility,
      referendumBallotResponses: [response, "Against"],
    }] }, address, now)!;
    expect(ballot.contests[0].measure?.text).toBe(text);
    expect(ballot.contests[0].measure?.summary).toBe(summary);
    expect(ballot.contests[0].measure?.responses).toEqual([response, "Against"]);
    expect(ballot.contests[0].eligibility).toBe(eligibility);
  });

  it("recognizes the ballot-measure type shown in the provider guide without a referendum title", () => {
    const ballot = normalizeBallot({ ...fixture, contests: [{
      type: "ballot-measure", ballotTitle: "Local Question", referendumText: "Official question wording.", referendumBallotResponses: ["YES", "NO"],
    }] }, address, now)!;
    expect(ballot.contests[0]).toMatchObject({ kind: "measure", title: "Local Question", measure: { text: "Official question wording.", responses: ["YES", "NO"] } });
  });

  it("distinguishes regular and special contests without tying saved choices to ballot placement", () => {
    const contest = { office: "U.S. House", district: { name: "District 1", scope: "congressional", id: "1" }, level: ["country"], type: "General", candidates: [{ name: "Example Person" }] };
    const first = normalizeBallot({ ...fixture, contests: [
      { ...contest, special: "No", ballotPlacement: 1 }, { ...contest, special: "Yes", ballotPlacement: 2 },
    ] }, address, now)!;
    const reordered = normalizeBallot({ ...fixture, contests: [
      { ...contest, special: "Yes", ballotPlacement: 1 }, { ...contest, special: "No", ballotPlacement: 3 },
    ] }, address, now)!;
    expect(first.contests[0].id).not.toBe(first.contests[1].id);
    expect(first.contests[0].special).toBeUndefined();
    expect(first.contests[1].special).toBe(true);
    expect(first.contests[0].candidates[0].id).not.toBe(first.contests[1].candidates[0].id);
    expect(reordered.contests.map((item) => item.id)).toEqual([first.contests[1].id, first.contests[0].id]);
  });

  it("keeps colliding contest rows independent and preserves distinct-content identities across reordering", () => {
    const first = { office: "Council", numberVotingFor: 1, candidates: [{ name: "First Person" }] };
    const second = { ...first, candidates: [{ name: "Second Person" }] };
    const ballot = normalizeBallot({ ...fixture, contests: [first, second, first] }, address, now)!;
    expect(new Set(ballot.contests.map((item) => item.id)).size).toBe(3);
    expect(new Set(ballot.contests.flatMap((item) => item.candidates.map((candidate) => candidate.id))).size).toBe(3);
    const reordered = normalizeBallot({ ...fixture, contests: [second, first, first] }, address, now)!;
    expect(reordered.contests.map((item) => item.id)).toEqual([ballot.contests[1].id, ballot.contests[0].id, ballot.contests[2].id]);
  });

  it("removes unsafe source links and includes local election office information", () => {
    const ballot = normalizeBallot({ ...fixture,
      contests: [{ office: "Mayor", candidates: [{ name: "First", candidateUrl: "javascript:alert(1)" }, { name: "Second", candidateUrl: "https://example.org" }], referendumUrl: "data:text/html,test" }],
      state: [{ name: "Example state", electionAdministrationBody: { ballotInfoUrl: "javascript:alert(1)", electionInfoUrl: "https://example.gov/elections" },
        local_jurisdiction: { electionAdministrationBody: { name: "County office", ballotInfoUrl: "https://county.example.gov/sample", electionInfoUrl: "https://user:secret@example.gov/" } } }],
    }, address, now)!;
    expect(ballot.contests[0].candidates[0].url).toBeUndefined();
    expect(ballot.contests[0].candidates[1].url).toBe("https://example.org/");
    expect(ballot.officialLinks).toEqual([
      { label: "Election information · Example state", url: "https://example.gov/elections" },
      { label: "Official ballot information · County office", url: "https://county.example.gov/sample" },
    ]);
  });

  it("keeps primary eligibility and voting location information", () => {
    const ballot = normalizeBallot({ ...fixture,
      contests: [{ office: "Primary race", primaryParty: "Example party", electorateSpecifications: "Official eligibility requirements.", numberElected: "2" }],
      pollingLocations: [{ address: { locationName: "Example school", line1: "20 Sample Road", city: "Sample City", state: "PA" }, pollingHours: "Official hours", notes: "Accessible entrance" }],
      earlyVoteSites: [{ name: "Election office", address: { line1: "21 Sample Road" } }],
      dropOffLocations: [{ address: { line1: "22 Sample Road" } }], mailOnly: true,
    }, address, now)!;
    expect(ballot.contests[0]).toMatchObject({ primaryParty: "Example party", eligibility: "Official eligibility requirements.", voteFor: null });
    expect(ballot.locations.map((item) => item.kind)).toEqual(["Election day", "Early voting", "Ballot drop-off"]);
    expect(ballot.locations[0]).toMatchObject({ name: "Example school", hours: "Official hours", notes: "Accessible entrance" });
    expect(ballot.mailOnly).toBe(true);
  });

  it("binds stable ballot identifiers to election and address, without embedding the address", () => {
    const first = normalizeBallot(fixture, address, now)!;
    expect(normalizeBallot(fixture, address, new Date())!.id).toBe(first.id);
    expect(first.id).not.toContain("Example");
    expect(normalizeBallot({ ...fixture, normalizedInput: { line1: "Different address" } }, address, now)!.id).not.toBe(first.id);
    expect(normalizeBallot({ ...fixture, election: { ...election, id: "8888" } }, address, now)!.id).not.toBe(first.id);
  });
});

describe("live provider boundaries", () => {
  it("reports missing configuration without making a request or substituting sample contests", async () => {
    vi.stubEnv("GOOGLE_CIVIC_API_KEY", "");
    expect(await lookupBallot(address, undefined, now)).toMatchObject({ status: "not_configured" });
    expect(await getBallotElections(now)).toMatchObject({ status: "not_configured", elections: [] });
    expect((await lookupBallot(address, undefined, now)).message).not.toContain("example");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the server-only key fallback, official sources, a timeout, and no fetch cache", async () => {
    vi.stubEnv("GOOGLE_CIVIC_API_KEY", "");
    vi.stubEnv("GOOGLE_KEY", "legacy-key");
    mockResponse(fixture);
    expect((await lookupBallot(address, "9999", now)).status).toBe("ready");
    const [url, options] = fetchMock.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.origin).toBe("https://www.googleapis.com");
    expect(parsed.searchParams.get("key")).toBe("legacy-key");
    expect(parsed.searchParams.get("officialOnly")).toBe("true");
    expect(parsed.searchParams.get("electionId")).toBe("9999");
    expect(parsed.searchParams.get("address")).toBe(address);
    expect(options).toMatchObject({ cache: "no-store", redirect: "error" });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it("requires election selection when the provider returns other elections", async () => {
    mockResponse({ ...fixture, otherElections: [{ ...election, id: "8888", name: "Another primary" }] });
    const response = await lookupBallot(address, undefined, now);
    expect(response.status).toBe("election_required");
    expect(response.elections?.map((item) => item.id)).toEqual(["9999", "8888"]);
    expect(response.ballot).toBeUndefined();
    expect((await lookupBallot(address, "9999", now)).status).toBe("ready");
  });

  it("does not infer an empty or complete ballot from missing contests", async () => {
    mockResponse({ election, normalizedInput: fixture.normalizedInput });
    const response = await lookupBallot(address, undefined, now);
    expect(response).toMatchObject({ status: "ready", ballot: { contests: [], coverage: "partial" } });
    expect(response.message).toContain("not an empty ballot");
  });

  it("filters test, past, malformed and duplicate elections", async () => {
    mockResponse({ elections: [election, { ...election, id: "2000" }, { ...election, id: "1", electionDay: "2026-09-17" },
      { ...election, id: "2", electionDay: "2026-09-18" }, { ...election, id: "3", electionDay: "2026-02-31" },
      { ...election, id: "4", electionDay: "2026-11-03-extra" }, election] });
    expect((await getBallotElections(now)).elections.map((item) => item.id)).toEqual(["2", "9999"]);
  });

  it.each(["2026-11-04T00:00:00Z", "2026-11-04T10:59:59Z"])("keeps election-day information available through the final US jurisdiction at %s", async (time) => {
    const electionDay = new Date(time);
    mockResponse({ elections: [election] });
    expect((await getBallotElections(electionDay)).elections.map((item) => item.id)).toEqual(["9999"]);
    mockResponse(fixture);
    expect((await lookupBallot(address, "9999", electionDay)).status).toBe("ready");
  });

  it("filters yesterday's election after midnight in Pacific/Pago_Pago", async () => {
    const nextDay = new Date("2026-11-04T11:00:00Z");
    mockResponse({ elections: [election] });
    expect((await getBallotElections(nextDay)).elections).toEqual([]);
    mockResponse(fixture);
    expect((await lookupBallot(address, "9999", nextDay)).status).toBe("unavailable");
  });

  it.each([
    { ...fixture, election: { ...election, id: "2000" } },
    { ...fixture, election: { ...election, electionDay: "2020-11-03" } },
    { kind: "malformed" },
  ])("does not return test, past or malformed ballot data", async (data) => {
    mockResponse(data);
    expect((await lookupBallot(address, undefined, now)).status).toBe("unavailable");
  });

  it("rejects a response for a different election than the one selected", async () => {
    mockResponse(fixture);
    expect((await lookupBallot(address, "8888", now)).status).toBe("unavailable");
  });

  it("reports address parsing errors without exposing provider error messages or keys", async () => {
    mockResponse({ error: { message: `Secret test-key for ${address}`, errors: [{ reason: "parseError" }] } }, 400);
    const response = await lookupBallot(address, undefined, now);
    expect(response.status).toBe("invalid_address");
    expect(JSON.stringify(response)).not.toContain("test-key");
    expect(JSON.stringify(response)).not.toContain(address);
  });

  it.each(["addressUnparseable", "multipleStreetSegmentsFound"])("rejects a %s address status even with an HTTP 200 and ballot data", async (status) => {
    mockResponse({ ...fixture, status, otherElections: [{ ...election, id: "8888" }], error: { message: `Sensitive ${address} test-key` } });
    const response = await lookupBallot(address, undefined, now);
    expect(response.status).toBe("invalid_address");
    expect(response.ballot).toBeUndefined();
    expect(response.elections).toBeUndefined();
    expect(JSON.stringify(response)).not.toContain(address);
    expect(JSON.stringify(response)).not.toContain("test-key");
  });

  it.each(["noStreetSegmentFound", "noAddressParameter", "electionOver", "electionUnknown", "internalLookupFailure", "unexpectedStatus", "", null])("does not treat non-success status %s as a matched ballot", async (status) => {
    mockResponse({ ...fixture, status });
    const response = await lookupBallot(address, "9999", now);
    expect(response.status).toBe("unavailable");
    expect(response.ballot).toBeUndefined();
    expect(response.message).toContain("does not mean there are no contests");
  });

  it("accepts explicit success and preserves responses with no top-level status", async () => {
    mockResponse({ ...fixture, status: "success" });
    const explicit = await lookupBallot(address, "9999", now);
    expect(explicit.status).toBe("ready");
    mockResponse(fixture);
    const absent = await lookupBallot(address, "9999", now);
    expect(absent).toEqual(explicit);
  });

  it("returns a safe unavailable state for failure, timeout and malformed provider data", async () => {
    mockResponse({ error: { message: `Secret test-key for ${address}` } }, 403);
    expect(await lookupBallot(address, undefined, now)).toMatchObject({ status: "unavailable" });
    expect(await getBallotElections(now)).toMatchObject({ status: "unavailable" });
    fetchMock.mockRejectedValue(new Error(`Timeout at ${address}?key=test-key`));
    const response = await lookupBallot(address, undefined, now);
    expect(response.status).toBe("unavailable");
    expect(JSON.stringify(response)).not.toContain("test-key");
    expect(JSON.stringify(response)).not.toContain(address);
    mockResponse({ unexpected: [] });
    expect(await getBallotElections(now)).toMatchObject({ status: "unavailable" });
  });
});
