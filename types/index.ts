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
