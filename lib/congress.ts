import type { BillResult, MemberResult, VotePosition } from "@/types";

const CONGRESS_API = "https://api.congress.gov/v3";

/** Get current congress number based on the year */
export function getCurrentCongress(): number {
  const year = new Date().getFullYear();
  return Math.floor((year - 1789) / 2) + 1;
}

/**
 * Parse a bill slug (e.g. "hr1234", "s456", "hjres78") into type and number.
 * Returns null if the slug doesn't match the expected format.
 */
export function parseBillSlug(
  billSlug: string
): { type: string; number: string } | null {
  const match = billSlug.match(/^([a-z]+)(\d+)$/i);
  if (!match) return null;
  return { type: match[1].toLowerCase(), number: match[2] };
}

/**
 * Fetch bill details from Congress.gov and normalize to our BillResult shape.
 */
export async function fetchBillDetails(
  congress: number | string,
  billSlug: string
): Promise<BillResult | null> {
  const parsed = parseBillSlug(billSlug);
  if (!parsed) return null;

  const url = `${CONGRESS_API}/bill/${congress}/${parsed.type}/${parsed.number}?api_key=${process.env.CONGRESS_KEY}&format=json`;
  const resp = await fetch(url);
  const data = await resp.json();
  const b = data.bill;
  if (!b) return null;

  // Fetch summary if available
  let summary = "";
  try {
    const sumResp = await fetch(
      `${CONGRESS_API}/bill/${congress}/${parsed.type}/${parsed.number}/summaries?api_key=${process.env.CONGRESS_KEY}&format=json`
    );
    const sumData = await sumResp.json();
    if (sumData.summaries && sumData.summaries.length > 0) {
      summary =
        sumData.summaries[sumData.summaries.length - 1].text || "";
      // Strip HTML tags from summary
      summary = summary.replace(/<[^>]*>/g, "");
    }
  } catch (e) {
    console.log(
      "Could not fetch bill summary:",
      e instanceof Error ? e.message : e
    );
  }

  // CBO cost estimates are embedded in the bill response as an array.
  // Each item: { title, description, pubDate, url } where url points to a
  // cbo.gov publication page (public domain, U.S. government work).
  const cboCostEstimates = Array.isArray(b.cboCostEstimates)
    ? (b.cboCostEstimates as Array<{
        title?: string;
        description?: string;
        pubDate?: string;
        url?: string;
      }>)
        .filter((e) => e.url)
        .map((e) => ({
          title: e.title || "",
          description: e.description || "",
          pubDate: e.pubDate || "",
          url: e.url || "",
        }))
    : undefined;

  // Normalize to match our BillResult interface
  return {
    short_title: b.title || "",
    title: b.title || "",
    bill_id: `${parsed.type}${parsed.number}-${congress}`,
    bill_slug: `${parsed.type}${parsed.number}`,
    bill_type: parsed.type,
    congress: congress.toString(),
    summary,
    image: "/imgs/wtp.png",
    introduced_date: b.introducedDate || "",
    latest_major_action: b.latestAction ? b.latestAction.text : "",
    latest_major_action_date: b.latestAction
      ? b.latestAction.actionDate
      : "",
    sponsor:
      b.sponsors && b.sponsors.length > 0 ? b.sponsors[0].fullName : "",
    cboCostEstimates: cboCostEstimates && cboCostEstimates.length > 0 ? cboCostEstimates : undefined,
  };
}

/**
 * Search bills. Uses GovTrack API for text search (Congress.gov API doesn't
 * support it) and Congress.gov API for listing latest bills.
 * `offset` is the 0-based index to start from (for pagination).
 */
export async function searchBills(
  query?: string | null,
  offset = 0
): Promise<BillResult[]> {
  const congress = getCurrentCongress();

  if (query) {
    return searchBillsGovTrack(query, congress, offset);
  }

  // No query — list latest bills from Congress.gov
  const url = `${CONGRESS_API}/bill/${congress}?limit=20&sort=updateDate+desc&offset=${offset}&api_key=${process.env.CONGRESS_KEY}&format=json`;
  const resp = await fetch(url);
  const data = await resp.json();
  const bills = data.bills || [];

  return bills.map(
    (b: {
      title?: string;
      type?: string;
      number?: string;
      congress?: number;
      introducedDate?: string;
      updateDate?: string;
      latestAction?: { text?: string; actionDate?: string };
    }): BillResult => {
      const type = (b.type || "hr").toLowerCase();
      const number = b.number || "";
      return {
        short_title: b.title || "",
        title: b.title || "",
        bill_id: `${type}${number}-${b.congress || congress}`,
        bill_slug: `${type}${number}`,
        bill_type: type,
        congress: (b.congress || congress).toString(),
        introduced_date: b.introducedDate || "",
        latest_major_action: b.latestAction ? b.latestAction.text || "" : "",
        latest_major_action_date: b.latestAction
          ? b.latestAction.actionDate || ""
          : "",
      };
    }
  );
}

/** GovTrack bill type strings → our slug prefixes */
const GOVTRACK_TYPE_MAP: Record<string, string> = {
  house_bill: "hr",
  senate_bill: "s",
  house_resolution: "hres",
  senate_resolution: "sres",
  house_joint_resolution: "hjres",
  senate_joint_resolution: "sjres",
  house_concurrent_resolution: "hconres",
  senate_concurrent_resolution: "sconres",
};

async function searchBillsGovTrack(
  query: string,
  congress: number,
  offset: number
): Promise<BillResult[]> {
  const url = `https://www.govtrack.us/api/v2/bill?q=${encodeURIComponent(query)}&congress=${congress}&limit=20&offset=${offset}&sort=-current_status_date`;
  const resp = await fetch(url);
  const data = await resp.json();
  const objects = data.objects || [];

  return objects.map(
    (b: {
      bill_type?: string;
      number?: number;
      congress?: number;
      title_without_number?: string;
      title?: string;
      introduced_date?: string;
      current_status_date?: string;
      current_status_description?: string;
    }): BillResult => {
      const type = GOVTRACK_TYPE_MAP[b.bill_type || ""] || "hr";
      const number = String(b.number || "");
      return {
        short_title: b.title_without_number || b.title || "",
        title: b.title_without_number || b.title || "",
        bill_id: `${type}${number}-${b.congress || congress}`,
        bill_slug: `${type}${number}`,
        bill_type: type,
        congress: (b.congress || congress).toString(),
        introduced_date: b.introduced_date || "",
        latest_major_action: b.current_status_description || "",
        latest_major_action_date: b.current_status_date || "",
      };
    }
  );
}

/**
 * Fetch members from Congress.gov API by state, optionally filtered by district.
 */
export async function fetchMembers(
  state: string,
  district?: string | number
): Promise<MemberResult[]> {
  if (!state) return [];

  const base = `${CONGRESS_API}/member`;
  let url: string;

  if (district) {
    url = `${base}/${state.toUpperCase()}/${district}?currentMember=true&api_key=${process.env.CONGRESS_KEY}&format=json`;
  } else {
    url = `${base}/${state.toUpperCase()}?currentMember=true&api_key=${process.env.CONGRESS_KEY}&format=json`;
  }

  const resp = await fetch(url);
  const data = await resp.json();
  const members = data.members || [];

  return members.map(
    (m: {
      bioguideId?: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      partyName?: string;
      party?: string;
      state?: string;
      district?: number;
    }): MemberResult => ({
      id: m.bioguideId || "",
      name:
        m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim(),
      party: m.partyName || m.party || "",
      state: m.state || state,
      district: m.district,
    })
  );
}

/**
 * Find companion bills in the other chamber by checking the related bills
 * endpoint first, then falling back to a title-based search.
 */
async function findCompanionBills(
  congress: number | string,
  billType: string,
  billNumber: string,
  companionType: string
): Promise<{ type: string; number: string }[]> {
  const results: { type: string; number: string }[] = [];

  // 1) Check related bills endpoint
  try {
    const relUrl = `${CONGRESS_API}/bill/${congress}/${billType}/${billNumber}/relatedbills?api_key=${process.env.CONGRESS_KEY}&format=json`;
    const relResp = await fetch(relUrl);
    if (relResp.ok) {
      const relData = await relResp.json();
      const related = relData.relatedBills || [];
      for (const rb of related) {
        const rbType = (rb.type || "").toLowerCase();
        const rbNumber = String(rb.number || "");
        if (rbType === companionType && rbNumber) {
          results.push({ type: rbType, number: rbNumber });
        }
      }
    }
  } catch (e) {
    console.log("Error fetching related bills:", e instanceof Error ? e.message : e);
  }

  if (results.length > 0) return results;

  // 2) Fallback: get this bill's title and check enacted laws for a
  //    companion bill with the same title in the other chamber.
  //    The Congress.gov /bill search API doesn't return relevant results,
  //    but /law/{congress}/pub reliably lists all enacted bills.
  try {
    const billUrl = `${CONGRESS_API}/bill/${congress}/${billType}/${billNumber}?api_key=${process.env.CONGRESS_KEY}&format=json`;
    const billResp = await fetch(billUrl);
    if (billResp.ok) {
      const billData = await billResp.json();
      const title = billData.bill?.title;
      if (title) {
        const titleLower = title.toLowerCase();
        const lawUrl = `${CONGRESS_API}/law/${congress}/pub?api_key=${process.env.CONGRESS_KEY}&format=json&limit=250`;
        const lawResp = await fetch(lawUrl);
        if (lawResp.ok) {
          const lawData = await lawResp.json();
          const laws = lawData.bills || [];
          for (const b of laws) {
            const bType = (b.type || "").toLowerCase();
            const bNumber = String(b.number || "");
            if (
              bType === companionType &&
              bNumber &&
              (b.title || "").toLowerCase() === titleLower
            ) {
              results.push({ type: companionType, number: bNumber });
            }
          }
        }
      }
    }
  } catch (e) {
    console.log("Error searching enacted laws for companion:", e instanceof Error ? e.message : e);
  }

  // 3) Last resort: try same number in other chamber (old behavior)
  if (results.length === 0) {
    results.push({ type: companionType, number: billNumber });
  }

  return results;
}

/**
 * Look up a member's vote on a specific bill using Congress.gov actions endpoint.
 * Checks roll call vote XML from senate.gov and clerk.house.gov.
 *
 * Returns: "Yea", "Nay", "Passed by Unanimous Consent",
 *          "Passed by Voice Vote", or "Has Not Voted On This Bill"
 */
export async function getMemberVoteOnBill(
  memberId: string,
  congress: number | string,
  billType: string,
  billNumber: string,
  chamber: string
): Promise<VotePosition> {
  try {
    // Step 1: Get bill actions to find roll call vote numbers
    const actionsUrl = `${CONGRESS_API}/bill/${congress}/${billType}/${billNumber}/actions?api_key=${process.env.CONGRESS_KEY}&format=json&limit=50`;
    const actionsResp = await fetch(actionsUrl);
    const actionsData = await actionsResp.json();
    const actions = actionsData.actions || [];

    // Find actions that have recorded votes, filtered to the target chamber.
    // A bill can pass one chamber by roll call and the other by voice vote,
    // so we must only look at the relevant chamber's actions.
    const chamberLower = chamber.toLowerCase();
    const chamberDomain = chamberLower === "senate" ? "senate.gov" : "clerk.house.gov";
    const rollCallVotes: { url?: string }[] = [];
    let passedByUC = false;
    let passedByVoice = false;

    for (const action of actions) {
      // Check if this action belongs to the target chamber
      const sourceName = (action.sourceSystem?.name || "").toLowerCase();
      const isTargetChamber =
        sourceName.includes(chamberLower) ||
        (chamberLower === "house" && sourceName.includes("house"));

      if (action.recordedVotes && action.recordedVotes.length > 0) {
        // Only include roll call votes from the target chamber
        for (const rv of action.recordedVotes) {
          const rvChamber = (rv.chamber || "").toLowerCase();
          const rvUrl = rv.url || "";
          if (
            rvChamber === chamberLower ||
            rvUrl.includes(chamberDomain) ||
            isTargetChamber
          ) {
            rollCallVotes.push(rv);
          }
        }
      }

      // Detect unanimous consent or voice vote passages for this chamber
      if (isTargetChamber) {
        const text = (action.text || "").toLowerCase();
        if (text.includes("passed") || text.includes("agreed to")) {
          if (text.includes("voice vote")) {
            passedByVoice = true;
          } else if (
            text.includes("unanimous consent") ||
            text.includes("without objection")
          ) {
            passedByUC = true;
          }
        }
      }
    }

    // Also check Library of Congress summary actions (sourceSystem code 9)
    // which may describe passage in a specific chamber
    for (const action of actions) {
      const sourceCode = action.sourceSystem?.code;
      if (sourceCode !== 9) continue;
      const text = (action.text || "").toLowerCase();
      if (!text.includes(chamberLower)) continue;
      if (text.includes("passed") || text.includes("agreed to")) {
        if (text.includes("voice vote")) {
          passedByVoice = true;
        } else if (
          text.includes("unanimous consent") ||
          text.includes("without objection")
        ) {
          passedByUC = true;
        }
      }
    }

    if (rollCallVotes.length === 0) {
      // No recorded roll call vote in this chamber — check if it passed another way
      if (passedByUC) return "Passed by Unanimous Consent";
      if (passedByVoice) return "Passed by Voice Vote";

      // Companion bill check: if this is a Senate bill with no Senate action,
      // check if the House companion bill was passed by the Senate (common for
      // bills where the Senate passes the House version directly via UC).
      // Similarly, if this is a House bill with no action, check the Senate companion.
      const companionMap: Record<string, string> = {
        s: "hr",
        hr: "s",
        sjres: "hjres",
        hjres: "sjres",
        sconres: "hconres",
        hconres: "sconres",
      };
      const companionType = companionMap[billType] || null;
      if (companionType) {
        const companionBills = await findCompanionBills(
          congress,
          billType,
          billNumber,
          companionType
        );
        for (const companion of companionBills) {
          try {
            const companionUrl = `${CONGRESS_API}/bill/${congress}/${companion.type}/${companion.number}/actions?api_key=${process.env.CONGRESS_KEY}&format=json&limit=50`;
            const companionResp = await fetch(companionUrl);
            if (companionResp.ok) {
              const companionData = await companionResp.json();
              const companionActions = companionData.actions || [];
              for (const ca of companionActions) {
                const caText = (ca.text || "").toLowerCase();
                // Check for passage in the target chamber
                const targetChamber = chamber.toLowerCase();
                const mentionsTarget =
                  caText.includes(targetChamber) ||
                  (ca.actionCode || "").toLowerCase().includes(targetChamber);
                const passedInTarget =
                  mentionsTarget &&
                  (caText.includes("passed") || caText.includes("agreed to"));
                if (passedInTarget) {
                  if (caText.includes("unanimous consent") || caText.includes("without objection")) {
                    return "Passed by Unanimous Consent";
                  }
                  if (caText.includes("voice vote")) {
                    return "Passed by Voice Vote";
                  }
                  // Check if companion has recorded votes for this chamber
                  if (ca.recordedVotes && ca.recordedVotes.length > 0) {
                    rollCallVotes.push(...ca.recordedVotes);
                    break; // Fall through to roll call vote checking below
                  }
                }
              }
            }
          } catch (e) {
            console.log("Error checking companion bill:", e instanceof Error ? e.message : e);
          }
          if (rollCallVotes.length > 0) break;
        }
      }

      if (rollCallVotes.length === 0) {
        return "Has Not Voted On This Bill";
      }
    }

    // Step 2: For each roll call vote, check the member's position
    for (const rv of rollCallVotes) {
      const voteUrl = rv.url;
      if (!voteUrl) continue;

      // Senate votes come from senate.gov XML
      if (voteUrl.includes("senate.gov")) {
        try {
          const xmlResp = await fetch(voteUrl);
          const xmlText = await xmlResp.text();
          // Parse XML to find member's vote by bioguide ID
          const memberPattern = new RegExp(
            `<member>[\\s\\S]*?<lis_member_id>[\\s\\S]*?</lis_member_id>[\\s\\S]*?<bioguide_id>${memberId}</bioguide_id>[\\s\\S]*?<vote_cast>([^<]+)</vote_cast>[\\s\\S]*?</member>`,
            "i"
          );
          const match = xmlText.match(memberPattern);
          if (match) {
            return match[1]; // "Yea", "Nay", "Not Voting", etc.
          }
        } catch (e) {
          console.log(
            "Error fetching Senate vote XML:",
            e instanceof Error ? e.message : e
          );
        }
      }
      // House votes from clerk.house.gov XML
      else if (voteUrl.includes("clerk.house.gov")) {
        try {
          const xmlResp = await fetch(voteUrl);
          const xmlText = await xmlResp.text();
          // House XML uses name-id (which is the bioguide ID) and <vote>Aye/No/etc.</vote>
          const memberPattern = new RegExp(
            `name-id="${memberId}"[^>]*>.*?<vote>([^<]+)</vote>`,
            "i"
          );
          const match = xmlText.match(memberPattern);
          if (match) {
            // Normalize House terminology: Aye -> Yea, No -> Nay
            const vote = match[1];
            if (vote === "Aye") return "Yea";
            if (vote === "No") return "Nay";
            return vote; // "Not Voting", "Present", etc.
          }
        } catch (e) {
          console.log(
            "Error fetching House vote XML:",
            e instanceof Error ? e.message : e
          );
        }
      }
    }

    return "Has Not Voted On This Bill";
  } catch (err) {
    console.log(
      "Error in getMemberVoteOnBill:",
      err instanceof Error ? err.message : err
    );
    return "Has Not Voted On This Bill";
  }
}

/** A single member's vote from a roll call */
export interface RollCallMemberVote {
  bioguideId?: string;
  name: string;
  party: string;
  state: string;
  vote: string; // "Yea", "Nay", "Not Voting", "Present"
}

/** Full roll call result for a bill */
export interface RollCallResult {
  chamber: string; // "Senate" or "House"
  question: string;
  date: string;
  votes: RollCallMemberVote[];
}

/**
 * Fetch all members' votes on a bill from the roll call XML.
 * Returns roll call results with every member's vote, or a special
 * status string for unanimous consent / voice vote / no vote found.
 */
export async function getAllVotesOnBill(
  congress: number | string,
  billType: string,
  billNumber: string
): Promise<
  | { type: "roll_call"; results: RollCallResult[]; chamberStatuses?: { chamber: string; status: string }[] }
  | { type: "special"; status: string }
> {
  try {
    const actionsUrl = `${CONGRESS_API}/bill/${congress}/${billType}/${billNumber}/actions?api_key=${process.env.CONGRESS_KEY}&format=json&limit=50`;
    const actionsResp = await fetch(actionsUrl);
    const actionsData = await actionsResp.json();
    const actions = actionsData.actions || [];

    const rollCallVotes: { url?: string }[] = [];
    let passedByUC = false;
    let passedByVoice = false;
    // Track per-chamber special statuses (UC / voice vote)
    const senateSpecial: { uc: boolean; voice: boolean } = { uc: false, voice: false };
    const houseSpecial: { uc: boolean; voice: boolean } = { uc: false, voice: false };

    const seenUrls = new Set<string>();
    for (const action of actions) {
      if (action.recordedVotes && action.recordedVotes.length > 0) {
        for (const rv of action.recordedVotes) {
          const url = rv.url || "";
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            rollCallVotes.push(rv);
          }
        }
      }
      const text = (action.text || "").toLowerCase();
      const sourceName = (action.sourceSystem?.name || "").toLowerCase();
      if (text.includes("passed") || text.includes("agreed to")) {
        if (text.includes("voice vote")) {
          passedByVoice = true;
          if (sourceName.includes("senate")) senateSpecial.voice = true;
          if (sourceName.includes("house")) houseSpecial.voice = true;
        } else if (
          text.includes("unanimous consent") ||
          text.includes("without objection")
        ) {
          passedByUC = true;
          if (sourceName.includes("senate")) senateSpecial.uc = true;
          if (sourceName.includes("house")) houseSpecial.uc = true;
        }
      }
    }

    if (rollCallVotes.length === 0) {
      if (passedByUC) return { type: "special", status: "Passed by Unanimous Consent" };
      if (passedByVoice) return { type: "special", status: "Passed by Voice Vote" };
      return { type: "special", status: "No recorded vote found" };
    }

    const results: RollCallResult[] = [];

    for (const rv of rollCallVotes) {
      const voteUrl = rv.url;
      if (!voteUrl) continue;

      if (voteUrl.includes("senate.gov")) {
        try {
          const xmlResp = await fetch(voteUrl);
          const xmlText = await xmlResp.text();

          const questionMatch = xmlText.match(/<vote_question_text>([^<]+)<\/vote_question_text>/i);
          const dateMatch = xmlText.match(/<vote_date>([^<]+)<\/vote_date>/i);

          const votes: RollCallMemberVote[] = [];
          const memberRegex = /<member>[\s\S]*?<first_name>([^<]*)<\/first_name>[\s\S]*?<last_name>([^<]*)<\/last_name>[\s\S]*?<party>([^<]*)<\/party>[\s\S]*?<state>([^<]*)<\/state>[\s\S]*?(?:<bioguide_id>([^<]*)<\/bioguide_id>[\s\S]*?)?<vote_cast>([^<]*)<\/vote_cast>[\s\S]*?<\/member>/gi;
          let m;
          while ((m = memberRegex.exec(xmlText)) !== null) {
            votes.push({
              bioguideId: m[5] || undefined,
              name: `${m[1]} ${m[2]}`.trim(),
              party: m[3],
              state: m[4],
              vote: m[6],
            });
          }

          results.push({
            chamber: "Senate",
            question: questionMatch?.[1] || "Vote",
            date: dateMatch?.[1] || "",
            votes,
          });
        } catch (e) {
          console.log("Error fetching Senate vote XML:", e instanceof Error ? e.message : e);
        }
      } else if (voteUrl.includes("clerk.house.gov")) {
        try {
          const xmlResp = await fetch(voteUrl);
          const xmlText = await xmlResp.text();

          const questionMatch = xmlText.match(/<vote-question>([^<]+)<\/vote-question>/i);
          const dateMatch = xmlText.match(/<action-date[^>]*>([^<]+)<\/action-date>/i);

          const votes: RollCallMemberVote[] = [];
          const recordedVoteRegex = /<recorded-vote>[\s\S]*?<legislator([^>]*)>([^<]*)<\/legislator>[\s\S]*?<vote>([^<]*)<\/vote>[\s\S]*?<\/recorded-vote>/gi;
          let m;
          while ((m = recordedVoteRegex.exec(xmlText)) !== null) {
            const attrs = m[1];
            const nameId = attrs.match(/name-id="([^"]*)"/)?.[1];
            const party = attrs.match(/party="([^"]*)"/)?.[1] || "";
            const state = attrs.match(/state="([^"]*)"/)?.[1] || "";
            let vote = m[3];
            if (vote === "Aye") vote = "Yea";
            if (vote === "No") vote = "Nay";
            votes.push({
              bioguideId: nameId || undefined,
              name: m[2].trim(),
              party,
              state,
              vote,
            });
          }

          results.push({
            chamber: "House",
            question: questionMatch?.[1] || "Vote",
            date: dateMatch?.[1] || "",
            votes,
          });
        } catch (e) {
          console.log("Error fetching House vote XML:", e instanceof Error ? e.message : e);
        }
      }
    }

    if (results.length === 0) {
      return { type: "special", status: "No recorded vote found" };
    }

    // Identify chambers that passed without a roll call
    const chamberStatuses: { chamber: string; status: string }[] = [];
    const hasSenateRollCall = results.some((r) => r.chamber === "Senate");
    const hasHouseRollCall = results.some((r) => r.chamber === "House");
    if (!hasSenateRollCall) {
      if (senateSpecial.uc) chamberStatuses.push({ chamber: "Senate", status: "Passed by Unanimous Consent" });
      else if (senateSpecial.voice) chamberStatuses.push({ chamber: "Senate", status: "Passed by Voice Vote" });
    }
    if (!hasHouseRollCall) {
      if (houseSpecial.uc) chamberStatuses.push({ chamber: "House", status: "Passed by Unanimous Consent" });
      else if (houseSpecial.voice) chamberStatuses.push({ chamber: "House", status: "Passed by Voice Vote" });
    }

    return { type: "roll_call", results, chamberStatuses: chamberStatuses.length > 0 ? chamberStatuses : undefined };
  } catch (err) {
    console.log("Error in getAllVotesOnBill:", err instanceof Error ? err.message : err);
    return { type: "special", status: "Error fetching votes" };
  }
}

/**
 * Fetch full member detail from Congress.gov by bioguide ID.
 * Includes terms, committees, sponsored legislation, and contact info.
 */
export async function fetchMemberDetail(
  bioguideId: string
): Promise<import("@/types").MemberDetail | null> {
  const url = `${CONGRESS_API}/member/${bioguideId}?api_key=${process.env.CONGRESS_KEY}&format=json`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  const m = data.member;
  if (!m) return null;

  const terms: { congress: number; chamber: string; startYear: number; endYear?: number }[] = [];
  let chamber = "";
  let state = "";
  let district: number | undefined;
  let leadership: string | undefined;

  if (m.terms) {
    for (const t of m.terms) {
      terms.push({
        congress: t.congress || 0,
        chamber: t.chamber === "Senate" ? "Senate" : "House",
        startYear: t.startYear || 0,
        endYear: t.endYear,
      });
    }
    const current = terms[terms.length - 1];
    if (current) {
      chamber = current.chamber;
    }
  }

  state = m.state || "";
  district = m.district;

  if (m.leadership && m.leadership.length > 0) {
    const current = m.leadership.find((l: { current?: boolean }) => l.current);
    if (current) {
      leadership = current.type;
    }
  }

  const committees: { name: string }[] = [];
  try {
    const comUrl = `${CONGRESS_API}/member/${bioguideId}/committees?api_key=${process.env.CONGRESS_KEY}&format=json`;
    const comResp = await fetch(comUrl);
    if (comResp.ok) {
      const comData = await comResp.json();
      for (const c of comData.committees || []) {
        committees.push({ name: c.name || c.committeeName || "" });
      }
    }
  } catch (e) {
    console.log("Error fetching committees:", e instanceof Error ? e.message : e);
  }

  const sponsoredBills: { billSlug: string; congress: string; title: string; introducedDate: string; latestAction: string }[] = [];
  try {
    const spUrl = `${CONGRESS_API}/member/${bioguideId}/sponsored-legislation?limit=5&sort=updateDate+desc&api_key=${process.env.CONGRESS_KEY}&format=json`;
    const spResp = await fetch(spUrl);
    if (spResp.ok) {
      const spData = await spResp.json();
      for (const b of spData.sponsoredLegislation || []) {
        const bType = (b.type || "hr").toLowerCase();
        const bNumber = String(b.number || "");
        sponsoredBills.push({
          billSlug: `${bType}${bNumber}`,
          congress: String(b.congress || ""),
          title: b.title || "",
          introducedDate: b.introducedDate || "",
          latestAction: b.latestAction?.text || "",
        });
      }
    }
  } catch (e) {
    console.log("Error fetching sponsored legislation:", e instanceof Error ? e.message : e);
  }

  return {
    bioguideId: m.bioguideId || bioguideId,
    name: m.directOrderName || m.invertedOrderName || `${m.firstName || ""} ${m.lastName || ""}`.trim(),
    party: m.partyName || "",
    state,
    district,
    chamber,
    imageUrl: `https://www.congress.gov/img/member/${bioguideId.toLowerCase()}_200.jpg`,
    website: m.officialWebsiteUrl || m.url,
    phone: m.addressInformation?.officePhone,
    leadership,
    terms,
    committees,
    sponsoredBills,
  };
}
