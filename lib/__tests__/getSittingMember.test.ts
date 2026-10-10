import { afterEach, describe, expect, it, vi } from "vitest";
import { getSittingMember } from "../elections";
import { houseMember, senator, serveCurrentMembers } from "@/test/fake-congress";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("getSittingMember", () => {
  it("names the House member who holds a district, matching Congress.gov's full state names to the race's state code", async () => {
    serveCurrentMembers([
      houseMember("L000602", "Lee, Summer L.", "Pennsylvania", 12),
      houseMember("D000530", "Deluzio, Christopher R.", "Pennsylvania", 17),
      houseMember("O000012", "Ohio Rep, Twelfth", "Ohio", 12),
      senator("M001243", "McCormick, David", "Pennsylvania"),
    ]);

    const member = await getSittingMember({ state: "PA", office: "H", district: "12" });

    expect(member).toEqual({ bioguideId: "L000602", name: "Lee, Summer L.", party: "Democratic" });
  });

  it("finds the holder of an at-large seat, which Congress.gov lists without a district", async () => {
    serveCurrentMembers([
      senator("S000033", "Sanders, Bernard", "Vermont", { partyName: "Independent" }),
      houseMember("B001318", "Balint, Becca", "Vermont"),
      senator("W000800", "Welch, Peter", "Vermont", { partyName: "Democratic" }),
    ]);

    const member = await getSittingMember({ state: "VT", office: "H", district: "01" });

    expect(member?.name).toBe("Balint, Becca");
  });

  it("includes the member's Congress.gov photo, whose file name can't be derived from their ID", async () => {
    const imageUrl = "https://www.congress.gov/img/member/6a986b632a68122e10181e6b_200.jpg";
    serveCurrentMembers([
      houseMember("W000832", "Wahab, Aisha", "California", 14, { depiction: { imageUrl } }),
    ]);

    const member = await getSittingMember({ state: "CA", office: "H", district: "14" });

    expect(member?.imageUrl).toBe(imageUrl);
  });

  it("returns no one when the House seat is vacant", async () => {
    serveCurrentMembers([houseMember("D000530", "Deluzio, Christopher R.", "Pennsylvania", 17)]);

    expect(await getSittingMember({ state: "PA", office: "H", district: "12" })).toBeNull();
  });

  it("does not guess whose Senate seat is on the ballot when both are filled", async () => {
    serveCurrentMembers([
      senator("M001243", "McCormick, David", "Pennsylvania"),
      senator("F000479", "Fetterman, John", "Pennsylvania", { partyName: "Democratic" }),
    ]);

    expect(await getSittingMember({ state: "PA", office: "S" })).toBeNull();
  });

  it("names the only sitting senator when the state's other seat is vacant", async () => {
    serveCurrentMembers([
      senator("F000479", "Fetterman, John", "Pennsylvania", { partyName: "Democratic" }),
      houseMember("L000602", "Lee, Summer L.", "Pennsylvania", 12),
    ]);

    const member = await getSittingMember({ state: "PA", office: "S" });

    expect(member).toEqual({ bioguideId: "F000479", name: "Fetterman, John", party: "Democratic" });
  });

  it("returns no one, instead of failing the race page, when Congress.gov is unavailable", async () => {
    serveCurrentMembers([houseMember("L000602", "Lee, Summer L.", "Pennsylvania", 12)], { failPage: 0 });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      expect(await getSittingMember({ state: "PA", office: "H", district: "12" })).toBeNull();
    } finally {
      consoleError.mockRestore();
    }
  });
});
