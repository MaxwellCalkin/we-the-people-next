// lib/__tests__/member-directory.test.ts
// Real MongoDB for scores (via setupTestMongo); Congress.gov is faked at fetch.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import connectDB from "@/lib/db";
import MemberScore from "@/models/MemberScore";
import { getMemberDirectory } from "@/lib/member-directory";
import { houseMember, senator, serveCurrentMembers } from "@/test/fake-congress";
import { setupTestMongo } from "@/test/mongo";

setupTestMongo();

beforeEach(async () => {
  await connectDB();
  await MemberScore.deleteMany({});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** What recomputing scores after a vote writes: scores, but no name or seat. */
function scoreOnlyRow(bioguideId: string, communityScore: number, matchingVotes: number, totalCompared: number) {
  return MemberScore.collection.insertOne({
    bioguideId,
    chamber: "House",
    communityScore,
    matchingVotes,
    totalCompared,
    updatedAt: new Date(),
  });
}

function quietly<T>(run: () => Promise<T>): Promise<T> {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  return run().finally(() => consoleError.mockRestore());
}

describe("getMemberDirectory", () => {
  it("lists every current member, with community scores for those who have them", async () => {
    serveCurrentMembers([
      houseMember("L000602", "Lee, Summer L.", "Pennsylvania", 12),
      houseMember("B001318", "Balint, Becca", "Vermont"),
      senator("F000479", "Fetterman, John", "Pennsylvania", { partyName: "Democratic" }),
    ]);
    await scoreOnlyRow("L000602", 75, 3, 4);

    const members = await getMemberDirectory();

    expect(members).toHaveLength(3);
    expect(members.find((m) => m.bioguideId === "L000602")).toMatchObject({
      name: "Lee, Summer L.",
      state: "Pennsylvania",
      district: 12,
      chamber: "House",
      communityScore: 75,
      matchingVotes: 3,
      totalCompared: 4,
    });
    expect(members.find((m) => m.bioguideId === "B001318")).toMatchObject({
      district: null,
      communityScore: null,
      matchingVotes: 0,
      totalCompared: 0,
    });
    expect(members.find((m) => m.bioguideId === "F000479")).toMatchObject({
      party: "Democratic",
      chamber: "Senate",
      communityScore: null,
    });
  });

  it("lists all of Congress when Congress.gov splits it across pages", async () => {
    const congress = Array.from({ length: 539 }, (_, i) =>
      houseMember(`M${String(i).padStart(6, "0")}`, `Member, Number ${i}`, "California", (i % 52) + 1)
    );
    serveCurrentMembers(congress);

    const members = await getMemberDirectory();

    expect(members).toHaveLength(539);
    expect(new Set(members.map((m) => m.bioguideId)).size).toBe(539);
  });

  it("leaves out people who have left Congress even if they still have a score", async () => {
    serveCurrentMembers([houseMember("L000602", "Lee, Summer L.", "Pennsylvania", 12)]);
    await scoreOnlyRow("R000001", 90, 9, 10);

    const members = await getMemberDirectory();

    expect(members.map((m) => m.bioguideId)).toEqual(["L000602"]);
  });

  it("uses each member's Congress.gov photo when it has one", async () => {
    const imageUrl = "https://www.congress.gov/img/member/6a986b632a68122e10181e6b_200.jpg";
    serveCurrentMembers([houseMember("W000832", "Wahab, Aisha", "California", 14, { depiction: { imageUrl } })]);

    const [member] = await getMemberDirectory();

    expect(member.imageUrl).toBe(imageUrl);
  });

  it("asks Next to cache Congress.gov's member list for a day instead of refetching it on every visit", async () => {
    const fetchMock = serveCurrentMembers([houseMember("L000602", "Lee, Summer L.", "Pennsylvania", 12)]);

    await getMemberDirectory();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toEqual({ next: { revalidate: 86_400 } });
  });

  it("falls back to stored member records, skipping score-only rows, when Congress.gov is unavailable", async () => {
    serveCurrentMembers([], { failPage: 0 });
    await MemberScore.create({
      bioguideId: "S000033",
      name: "Sanders, Bernard",
      party: "Independent",
      state: "Vermont",
      chamber: "Senate",
      communityScore: 60,
      matchingVotes: 3,
      totalCompared: 5,
    });
    await scoreOnlyRow("L000602", 75, 3, 4);

    const members = await quietly(getMemberDirectory);

    expect(members).toEqual([
      {
        bioguideId: "S000033",
        name: "Sanders, Bernard",
        party: "Independent",
        state: "Vermont",
        district: null,
        chamber: "Senate",
        communityScore: 60,
        matchingVotes: 3,
        totalCompared: 5,
      },
    ]);
  });

  it("never passes off part of Congress as the whole list when a later page fails", async () => {
    const congress = Array.from({ length: 300 }, (_, i) =>
      houseMember(`M${String(i).padStart(6, "0")}`, `Member, Number ${i}`, "Texas", (i % 38) + 1)
    );
    serveCurrentMembers(congress, { failPage: 1 });

    const members = await quietly(getMemberDirectory);

    expect(members).toEqual([]);
  });
});
