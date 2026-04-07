export interface BillResult {
  short_title: string;
  title: string;
  bill_id: string;
  bill_slug: string;
  bill_type: string;
  congress: string;
  summary?: string;
  image?: string;
  introduced_date?: string;
  latest_major_action: string;
  latest_major_action_date: string;
  sponsor?: string;
  cboCostEstimates?: CboCostEstimate[];
}

export interface CboCostEstimate {
  title: string;
  description: string;
  pubDate: string;
  url: string;
}

export interface MemberResult {
  id: string;
  name: string;
  party: string;
  state: string;
  district?: number;
  url?: string;
}

export type VotePosition =
  | "Yea"
  | "Nay"
  | "Passed by Unanimous Consent"
  | "Passed by Voice Vote"
  | "Has Not Voted On This Bill"
  | "Not Voting"
  | "Present"
  | string;

export interface IMemberVote {
  bioguideId: string;
  billSlug: string;
  congress: string;
  vote: string;
  chamber: string;
  fetchedAt: Date;
}

export interface IMemberScore {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district: number | null;
  chamber: string;
  communityScore: number | null;
  matchingVotes: number;
  totalCompared: number;
  updatedAt: Date;
}

export interface IBillVoteEvent {
  billSlug: string;
  congress: string;
  votedAt: Date;
}

export interface MemberDetail {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: number;
  chamber: string;
  imageUrl: string;
  website?: string;
  phone?: string;
  leadership?: string;
  terms: { congress: number; chamber: string; startYear: number; endYear?: number }[];
  committees: { name: string }[];
  sponsoredBills: { billSlug: string; congress: string; title: string; introducedDate: string; latestAction: string }[];
}
