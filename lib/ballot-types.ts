export interface BallotElection {
  id: string;
  name: string;
  date: string;
}

export interface BallotCandidate {
  id: string;
  name: string;
  party?: string;
  url?: string;
}

export interface BallotSource {
  name: string;
  official: boolean;
}

export interface BallotContest {
  id: string;
  title: string;
  level: "Federal" | "State" | "Local" | "Ballot questions" | "Other";
  kind: "candidate" | "measure";
  district?: string;
  voteFor: number | null;
  primaryParty?: string;
  special?: boolean;
  eligibility?: string;
  candidates: BallotCandidate[];
  measure?: {
    text?: string;
    summary?: string;
    yesMeaning?: string;
    noMeaning?: string;
    url?: string;
    responses: string[];
  };
  sources: BallotSource[];
}

export interface BallotData {
  id: string;
  election: BallotElection;
  normalizedAddress: string;
  locationLabel: string;
  contests: BallotContest[];
  coverage: "partial" | "sample";
  checkedAt: string;
  officialLinks: { label: string; url: string }[];
  locations: {
    kind: "Election day" | "Early voting" | "Ballot drop-off";
    name: string;
    address: string;
    hours?: string;
    notes?: string;
  }[];
  mailOnly: boolean;
}

export interface BallotLookupResponse {
  status: "ready" | "unavailable" | "not_configured" | "election_required" | "invalid_address";
  message?: string;
  ballot?: BallotData;
  elections?: BallotElection[];
}

export interface BallotElectionsResponse {
  status: "ready" | "unavailable" | "not_configured";
  elections: BallotElection[];
  message?: string;
}
