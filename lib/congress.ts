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

    // Find actions that have recorded votes
    const rollCallVotes: { url?: string }[] = [];
    let passedByUC = false;
    let passedByVoice = false;

    for (const action of actions) {
      if (action.recordedVotes && action.recordedVotes.length > 0) {
        rollCallVotes.push(...action.recordedVotes);
      }
      // Detect unanimous consent or voice vote passages
      const text = (action.text || "").toLowerCase();
      if (text.includes("passed") || text.includes("agreed to")) {
        if (
          text.includes("unanimous consent") ||
          text.includes("without objection") ||
          text.includes("without amendment")
        ) {
          passedByUC = true;
        }
        if (text.includes("voice vote")) {
          passedByVoice = true;
        }
      }
    }

    if (rollCallVotes.length === 0) {
      // No recorded roll call vote -- check if it passed another way
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
