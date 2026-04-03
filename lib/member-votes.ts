// lib/member-votes.ts
import connectDB from "@/lib/db";
import MemberVote from "@/models/MemberVote";
import MemberScore from "@/models/MemberScore";
import Bill from "@/models/Bill";
import { parseBillSlug } from "@/lib/congress";

const CONGRESS_API = "https://api.congress.gov/v3";

/**
 * Fetch roll call votes for a bill and cache all member votes.
 * Parses Senate XML from senate.gov and House XML from clerk.house.gov.
 * Then recomputes community alignment scores for affected members.
 *
 * This should be called fire-and-forget (non-blocking) after a user votes.
 */
export async function cacheVotesAndRecomputeScores(
  billSlug: string,
  congress: string
): Promise<void> {
  try {
    await connectDB();

    const parsed = parseBillSlug(billSlug);
    if (!parsed) return;

    const actionsUrl = `${CONGRESS_API}/bill/${congress}/${parsed.type}/${parsed.number}/actions?api_key=${process.env.CONGRESS_KEY}&format=json&limit=50`;
    const actionsResp = await fetch(actionsUrl);
    if (!actionsResp.ok) return;
    const actionsData = await actionsResp.json();
    const actions = actionsData.actions || [];

    const rollCallVotes: { url: string; chamber: string }[] = [];
    const seenUrls = new Set<string>();

    for (const action of actions) {
      if (action.recordedVotes && action.recordedVotes.length > 0) {
        // Only cache passage/final votes, not procedural votes that share the
        // same bill slug but record a different question (recommit, amendments,
        // points of order, motions to table/proceed, cloture, etc.)
        const text = (action.text || "").toLowerCase();
        const isProcedural =
          text.includes("recommit") ||
          text.includes("amendment") ||
          text.includes("point of order") ||
          text.includes("motion to table") ||
          text.includes("motion to proceed") ||
          text.includes("cloture") ||
          text.includes("motion to reconsider");
        if (isProcedural) continue;

        for (const rv of action.recordedVotes) {
          if (!rv.url || seenUrls.has(rv.url)) continue;
          seenUrls.add(rv.url);
          const chamber = rv.url.includes("senate.gov") ? "Senate" : "House";
          rollCallVotes.push({ url: rv.url, chamber });
        }
      }
    }

    if (rollCallVotes.length === 0) return;

    const bulkOps: {
      updateOne: {
        filter: { bioguideId: string; billSlug: string; congress: string };
        update: { $set: { vote: string; chamber: string; fetchedAt: Date } };
        upsert: boolean;
      };
    }[] = [];

    for (const rv of rollCallVotes) {
      try {
        const xmlResp = await fetch(rv.url);
        if (!xmlResp.ok) continue;
        const xmlText = await xmlResp.text();

        if (rv.chamber === "Senate") {
          const memberRegex = /<member>[\s\S]*?<bioguide_id>([^<]+)<\/bioguide_id>[\s\S]*?<vote_cast>([^<]+)<\/vote_cast>[\s\S]*?<\/member>/gi;
          let match;
          while ((match = memberRegex.exec(xmlText)) !== null) {
            const bioguideId = match[1].trim();
            const vote = normalizeVote(match[2].trim());
            bulkOps.push({
              updateOne: {
                filter: { bioguideId, billSlug, congress },
                update: { $set: { vote, chamber: "Senate", fetchedAt: new Date() } },
                upsert: true,
              },
            });
          }
        } else {
          const memberRegex = /name-id="([^"]+)"[^>]*>[\s\S]*?<vote>([^<]+)<\/vote>/gi;
          let match;
          while ((match = memberRegex.exec(xmlText)) !== null) {
            const bioguideId = match[1].trim();
            const vote = normalizeVote(match[2].trim());
            bulkOps.push({
              updateOne: {
                filter: { bioguideId, billSlug, congress },
                update: { $set: { vote, chamber: "House", fetchedAt: new Date() } },
                upsert: true,
              },
            });
          }
        }
      } catch (e) {
        console.log("Error parsing roll call XML:", e instanceof Error ? e.message : e);
      }
    }

    if (bulkOps.length > 0) {
      await MemberVote.bulkWrite(bulkOps);
    }

    await recomputeScoresForBill(billSlug, congress);
  } catch (e) {
    console.log("Error in cacheVotesAndRecomputeScores:", e instanceof Error ? e.message : e);
  }
}

function normalizeVote(vote: string): string {
  if (vote === "Aye") return "Yea";
  if (vote === "No") return "Nay";
  return vote;
}

async function recomputeScoresForBill(
  billSlug: string,
  congress: string
): Promise<void> {
  const memberVotesOnBill = await MemberVote.find({ billSlug, congress })
    .select("bioguideId")
    .lean();

  const bioguideIds = [...new Set(memberVotesOnBill.map((mv) => mv.bioguideId))];
  if (bioguideIds.length === 0) return;

  const communityBills = await Bill.find({
    $or: [{ yeas: { $gt: 0 } }, { nays: { $gt: 0 } }],
  })
    .select("billSlug yeas nays")
    .lean();

  const communityMajority = new Map<string, string>();
  for (const bill of communityBills) {
    communityMajority.set(bill.billSlug, bill.yeas >= bill.nays ? "Yea" : "Nay");
  }

  const communityBillSlugs = [...communityMajority.keys()];

  const allMemberVotes = await MemberVote.find({
    bioguideId: { $in: bioguideIds },
    billSlug: { $in: communityBillSlugs },
  }).lean();

  const votesByMember = new Map<string, { billSlug: string; vote: string; chamber: string }[]>();
  for (const mv of allMemberVotes) {
    const list = votesByMember.get(mv.bioguideId) || [];
    list.push({ billSlug: mv.billSlug, vote: mv.vote, chamber: mv.chamber });
    votesByMember.set(mv.bioguideId, list);
  }

  const scoreBulkOps: {
    updateOne: {
      filter: { bioguideId: string };
      update: { $set: Record<string, unknown> };
      upsert: boolean;
    };
  }[] = [];

  for (const bioguideId of bioguideIds) {
    const votes = votesByMember.get(bioguideId) || [];
    let matching = 0;
    let total = 0;

    for (const v of votes) {
      const majority = communityMajority.get(v.billSlug);
      if (!majority) continue;
      if (v.vote !== "Yea" && v.vote !== "Nay") continue;
      total++;
      if (v.vote === majority) matching++;
    }

    const communityScore = total > 0 ? Math.round((matching / total) * 100) : null;
    const chamber = votes[0]?.chamber || "House";

    scoreBulkOps.push({
      updateOne: {
        filter: { bioguideId },
        update: {
          $set: {
            communityScore,
            matchingVotes: matching,
            totalCompared: total,
            chamber,
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    });
  }

  if (scoreBulkOps.length > 0) {
    await MemberScore.bulkWrite(scoreBulkOps);
  }
}

/**
 * Compute personal alignment score for a specific user against a specific member.
 */
export async function computePersonalAlignment(
  bioguideId: string,
  yeaBillSlugs: string[],
  nayBillSlugs: string[]
): Promise<{ score: number | null; matching: number; total: number }> {
  const allUserSlugs = [...yeaBillSlugs, ...nayBillSlugs];
  if (allUserSlugs.length === 0) return { score: null, matching: 0, total: 0 };

  const memberVotes = await MemberVote.find({
    bioguideId,
    billSlug: { $in: allUserSlugs },
  }).lean();

  let matching = 0;
  let total = 0;

  for (const mv of memberVotes) {
    if (mv.vote !== "Yea" && mv.vote !== "Nay") continue;
    const userPosition = yeaBillSlugs.includes(mv.billSlug) ? "Yea" : "Nay";
    total++;
    if (mv.vote === userPosition) matching++;
  }

  const score = total > 0 ? Math.round((matching / total) * 100) : null;
  return { score, matching, total };
}
