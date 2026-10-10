import { describe, expect, it } from "vitest";
import {
  agreement,
  billChamber,
  congressGovUrl,
  displayName,
  memberVoteInfo,
  formatBillNumber,
  formatDate,
  formatPersonName,
  partyInfo,
  pluralize,
  seatLabel,
  stateCode,
  timeAgo,
  voteShares,
} from "@/lib/format";

describe("formatBillNumber", () => {
  it("formats House and Senate bill slugs the way Congress cites them", () => {
    expect(formatBillNumber("hr725")).toBe("H.R. 725");
    expect(formatBillNumber("s4998")).toBe("S. 4998");
    expect(formatBillNumber("sjres12")).toBe("S.J.Res. 12");
    expect(formatBillNumber("HCONRES3")).toBe("H.Con.Res. 3");
  });

  it("upper-cases slugs it cannot parse instead of dropping them", () => {
    expect(formatBillNumber("not-a-bill")).toBe("NOT-A-BILL");
  });
});

describe("billChamber", () => {
  it("derives the originating chamber from the bill type", () => {
    expect(billChamber("hr725")).toBe("House");
    expect(billChamber("sres9")).toBe("Senate");
    expect(billChamber("")).toBeNull();
  });
});

describe("displayName", () => {
  it("turns Congress.gov 'Last, First' names into natural order", () => {
    expect(displayName("Wahab, Aisha")).toBe("Aisha Wahab");
    expect(displayName("Lee, Summer L.")).toBe("Summer L. Lee");
  });

  it("keeps generational suffixes at the end", () => {
    expect(displayName("Smith, John, Jr.")).toBe("John Smith, Jr.");
  });

  it("leaves names without a comma alone", () => {
    expect(displayName("Bernard Sanders")).toBe("Bernard Sanders");
  });

  it("returns an empty name for a record without one instead of crashing", () => {
    expect(displayName(undefined)).toBe("");
    expect(displayName(null)).toBe("");
  });
});

describe("formatPersonName", () => {
  it("title-cases ALL-CAPS FEC names and puts them in natural order", () => {
    expect(formatPersonName("FETTERMAN, JOHN K")).toBe("John K Fetterman");
    expect(formatPersonName("MCCORMICK, DAVID H")).toBe("David H McCormick");
    expect(formatPersonName("OCASIO-CORTEZ, ALEXANDRIA")).toBe("Alexandria Ocasio-Cortez");
    expect(formatPersonName("O'ROURKE, ROBERT")).toBe("Robert O'Rourke");
  });

  it("moves Dr. to the front and drops other honorifics tacked onto FEC names", () => {
    expect(formatPersonName("HAYES, JAMES DR.")).toBe("Dr. James Hayes");
    expect(formatPersonName("SMITH, JANE MRS")).toBe("Jane Smith");
  });

  it("keeps generational suffixes readable", () => {
    expect(formatPersonName("SMITH, JOHN, JR")).toBe("John Smith, Jr.");
    expect(formatPersonName("DOE, JAMES III")).toBe("James III Doe");
  });

  it("leaves names that already have lowercase letters alone apart from order", () => {
    expect(formatPersonName("McBath, Lucy")).toBe("Lucy McBath");
  });
});

describe("partyInfo", () => {
  it("normalizes the party spellings used by Congress.gov and roll calls", () => {
    expect(partyInfo("Democratic")).toEqual({ code: "D", label: "Democrat" });
    expect(partyInfo("R")).toEqual({ code: "R", label: "Republican" });
    expect(partyInfo("ID")).toEqual({ code: "I", label: "Independent" });
  });

  it("reports a missing party rather than guessing", () => {
    expect(partyInfo("")).toEqual({ code: "", label: "Party not listed" });
    expect(partyInfo(undefined).code).toBe("");
  });
});

describe("stateCode and seatLabel", () => {
  it("maps full state names and codes in any case to the postal code", () => {
    expect(stateCode("Pennsylvania")).toBe("PA");
    expect(stateCode("pa")).toBe("PA");
    expect(stateCode("Atlantis")).toBe("Atlantis");
  });

  it("recognizes Congress.gov's name for the U.S. Virgin Islands", () => {
    expect(stateCode("Virgin Islands")).toBe("VI");
  });

  it("labels House seats with padded district numbers and Senate seats by state", () => {
    expect(seatLabel("House", "California", 7)).toBe("CA-07");
    expect(seatLabel("House", "ny", "14")).toBe("NY-14");
    expect(seatLabel("House", "Vermont", 0)).toBe("VT at-large");
    expect(seatLabel("Senate", "TX", null)).toBe("Texas");
  });

  it("labels an at-large seat that Congress.gov lists without a district", () => {
    expect(seatLabel("House", "Wyoming", undefined)).toBe("WY at-large");
  });

  it("gives an empty label for a record without a state instead of crashing", () => {
    expect(stateCode(undefined)).toBe("");
    expect(seatLabel("House", undefined, 3)).toBe("");
    expect(seatLabel("Senate", null)).toBe("");
  });
});

describe("formatDate", () => {
  it("formats calendar dates without shifting the day across timezones", () => {
    expect(formatDate("2026-10-05")).toBe("Oct 5, 2026");
    expect(formatDate("2026-10-05", "long")).toBe("October 5, 2026");
  });

  it("returns an empty string for missing or invalid input", () => {
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("not a date")).toBe("");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-10-09T12:00:00Z");

  it("describes recent times relative to now", () => {
    expect(timeAgo("2026-10-09T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-10-09T09:00:00Z", now)).toBe("3 hours ago");
    expect(timeAgo("2026-10-06T12:00:00Z", now)).toBe("3 days ago");
    expect(timeAgo("2026-10-08T12:00:00Z", now)).toBe("yesterday");
  });
});

describe("voteShares", () => {
  it("returns whole-number shares that add up to 100", () => {
    expect(voteShares(277, 155)).toEqual({ yea: 64, nay: 36, total: 432 });
    expect(voteShares(1, 2)).toEqual({ yea: 33, nay: 67, total: 3 });
  });

  it("reports zero shares when nobody has voted", () => {
    expect(voteShares(0, 0)).toEqual({ yea: 0, nay: 0, total: 0 });
  });
});

describe("congressGovUrl", () => {
  it("links to the official Congress.gov bill page", () => {
    expect(congressGovUrl("119", "hr725")).toBe("https://www.congress.gov/bill/119th-congress/house-bill/725");
    expect(congressGovUrl(121, "sjres4")).toBe(
      "https://www.congress.gov/bill/121st-congress/senate-joint-resolution/4"
    );
    expect(congressGovUrl("112", "s1")).toBe("https://www.congress.gov/bill/112th-congress/senate-bill/1");
  });

  it("returns null when the slug or congress can't be mapped", () => {
    expect(congressGovUrl("119", "xyz1")).toBeNull();
    expect(congressGovUrl("abc", "hr1")).toBeNull();
  });
});

describe("memberVoteInfo and agreement", () => {
  it("treats Aye/No roll-call wording as Yea/Nay", () => {
    expect(memberVoteInfo("Aye")).toEqual({ position: "Yea", label: "Yea" });
    expect(memberVoteInfo("No")).toEqual({ position: "Nay", label: "Nay" });
  });

  it("gives non-votes a readable label and no position", () => {
    expect(memberVoteInfo("Not Voting")).toEqual({ position: null, label: "Didn't vote" });
    expect(memberVoteInfo("Passed by Voice Vote").position).toBeNull();
    expect(memberVoteInfo("Has Not Voted On This Bill").label).toBe("No recorded vote yet");
  });

  it("compares a member's recorded vote with the user's", () => {
    expect(agreement("Yea", "Aye")).toBe("agree");
    expect(agreement("Yea", "Nay")).toBe("disagree");
    expect(agreement("Nay", "Not Voting")).toBe("none");
    expect(agreement(undefined, "Yea")).toBe("none");
  });
});

describe("pluralize", () => {
  it("uses the singular only for exactly one", () => {
    expect(pluralize(1, "vote")).toBe("1 vote");
    expect(pluralize(0, "vote")).toBe("0 votes");
    expect(pluralize(1200, "member")).toBe("1,200 members");
  });
});
