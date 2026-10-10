// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { GET } from "./elections/route";
import { getBallotElections, lookupBallot } from "@/lib/ballot-provider";
import { ballotElectionsCache, ballotLookupThrottle } from "@/lib/ballot-quota";

vi.mock("@/lib/ballot-provider", () => ({ lookupBallot: vi.fn(), getBallotElections: vi.fn() }));
const address = "123 Example Street, Sample City, PA 17000";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/ballot", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  ballotLookupThrottle.reset();
  ballotElectionsCache.reset();
});

describe("private ballot API", () => {
  it("accepts a valid address in the request body and makes the response noncacheable", async () => {
    vi.mocked(lookupBallot).mockResolvedValue({ status: "not_configured", message: "Not connected" });
    const response = await POST(request({ address: ` ${address} `, electionId: "9999" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(lookupBallot).toHaveBeenCalledWith(address, "9999");
    expect(await response.json()).toEqual({ status: "not_configured", message: "Not connected" });
  });

  it.each([null, [], {}, { address: 123 }, { address: "ZIP only" }, { address: "x".repeat(301) }, { address: `${address}\n` },
    { address, electionId: "anything" }, { address, electionId: "2000" }, { address, electionId: 9999 }])("rejects invalid input without contacting the provider", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(lookupBallot).not.toHaveBeenCalled();
  });

  it("rejects non-JSON content and malformed JSON", async () => {
    expect((await POST(request({ address }, { "content-type": "text/plain" }))).status).toBe(415);
    const invalid = new Request("http://localhost/api/ballot", { method: "POST", headers: { "content-type": "application/json" }, body: "{invalid" });
    expect((await POST(invalid)).status).toBe(400);
    expect(lookupBallot).not.toHaveBeenCalled();
  });

  it("rejects oversized requests with or without a content-length header", async () => {
    expect((await POST(request({ address }, { "content-length": "9000" }))).status).toBe(413);
    expect((await POST(request({ address, extra: "x".repeat(5000) }))).status).toBe(413);
    expect(lookupBallot).not.toHaveBeenCalled();
  });

  it("serves the election list privately without addresses", async () => {
    vi.mocked(getBallotElections).mockResolvedValue({ status: "ready", elections: [] });
    const response = await GET();
    expect(response.headers.get("cache-control")).toContain("private, no-store");
    expect(await response.json()).toEqual({ status: "ready", elections: [] });
  });

  it("answers repeat visits from one cached election list instead of calling the provider each time", async () => {
    vi.mocked(getBallotElections).mockResolvedValue({ status: "ready", elections: [] });
    await GET();
    await GET();
    expect(getBallotElections).toHaveBeenCalledTimes(1);
  });

  it("returns 429 with Retry-After once a client exceeds 10 lookups, without contacting the provider", async () => {
    vi.mocked(lookupBallot).mockResolvedValue({ status: "not_configured" });
    const client = { "x-forwarded-for": "203.0.113.5" };
    for (let i = 0; i < 10; i++) expect((await POST(request({ address }, client))).status).toBe(200);

    const limited = await POST(request({ address }, client));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(limited.headers.get("cache-control")).toContain("no-store");
    expect(await limited.json()).toMatchObject({ status: "rate_limited" });
    expect(lookupBallot).toHaveBeenCalledTimes(10);

    expect((await POST(request({ address }, { "x-forwarded-for": "198.51.100.7" }))).status).toBe(200);
  });

  it("does not count rejected input toward the lookup limit", async () => {
    vi.mocked(lookupBallot).mockResolvedValue({ status: "not_configured" });
    const client = { "x-forwarded-for": "203.0.113.9" };
    for (let i = 0; i < 12; i++) expect((await POST(request({ address: "too short" }, client))).status).toBe(400);
    expect((await POST(request({ address }, client))).status).toBe(200);
  });
});
