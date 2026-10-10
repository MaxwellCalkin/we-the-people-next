import type { BallotData, BallotSource } from "./ballot-types";

const sources: BallotSource[] = [{ name: "Fictional example", official: false }];

/** Fictional content for exploring preparation tools; never a location lookup result. */
export const exampleBallot: BallotData = {
  id: "example-ballot-v1",
  election: {
    id: "example-election-v1",
    name: "Example general election",
    date: "2026-11-03",
  },
  normalizedAddress: "Example location — no address entered",
  locationLabel: "Example precinct",
  coverage: "sample",
  checkedAt: "2026-09-18T12:00:00.000Z",
  officialLinks: [],
  locations: [],
  mailOnly: false,
  contests: [
    {
      id: "example-house",
      title: "U.S. House of Representatives",
      level: "Federal",
      kind: "candidate",
      district: "Example congressional district",
      voteFor: 1,
      candidates: [
        { id: "example-alex-morgan", name: "Alex Morgan", party: "Example Civic Party" },
        { id: "example-jordan-rivera", name: "Jordan Rivera", party: "Example Community Party" },
        { id: "example-casey-chen", name: "Casey Chen", party: "Independent" },
      ],
      sources,
    },
    {
      id: "example-state-house",
      title: "State representative",
      level: "State",
      kind: "candidate",
      district: "Example state house district",
      voteFor: 1,
      candidates: [
        { id: "example-sam-bennett", name: "Sam Bennett", party: "Example Community Party" },
        { id: "example-taylor-reed", name: "Taylor Reed", party: "Example Civic Party" },
      ],
      sources,
    },
    {
      id: "example-school-board",
      title: "School board",
      level: "Local",
      kind: "candidate",
      district: "Example school district · at large",
      voteFor: 2,
      candidates: [
        { id: "example-avery-patel", name: "Avery Patel", party: "Nonpartisan" },
        { id: "example-riley-brooks", name: "Riley Brooks", party: "Nonpartisan" },
        { id: "example-quinn-lee", name: "Quinn Lee", party: "Nonpartisan" },
      ],
      sources,
    },
    {
      id: "example-judge-retention",
      title: "Judicial retention: Judge Jamie Ellis",
      level: "Ballot questions",
      kind: "measure",
      district: "Example judicial district",
      voteFor: 1,
      candidates: [],
      measure: {
        text: "Shall Judge Jamie Ellis be retained in office for another term as a judge of the Example District Court?",
        summary: "This fictional retention question asks whether a sitting judge should continue for another term. It does not ask voters to choose between candidates.",
        yesMeaning: "A Yes vote supports retaining this judge for another term.",
        noMeaning: "A No vote opposes retaining this judge for another term.",
        responses: ["Yes", "No"],
      },
      sources,
    },
    {
      id: "example-library-bond",
      title: "Question 1: Library improvement bond",
      level: "Ballot questions",
      kind: "measure",
      district: "Example municipality",
      voteFor: 1,
      candidates: [],
      measure: {
        text: "Shall the Example Municipality be authorized to issue general obligation bonds in a principal amount not exceeding $5,000,000 to renovate and improve its public library, with principal and interest payable from property taxes levied by the municipality?",
        summary: "This fictional question asks permission for the municipality to borrow up to $5 million for library improvements and repay the debt, including interest, through property taxes. It does not specify an individual household's tax cost.",
        yesMeaning: "A Yes vote supports authorizing the borrowing and property-tax repayment described in this question.",
        noMeaning: "A No vote opposes this bond authorization. It does not by itself decide whether future library projects could receive other funding.",
        responses: ["Yes", "No"],
      },
      sources,
    },
  ],
};
