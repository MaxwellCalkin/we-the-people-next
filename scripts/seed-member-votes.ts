/**
 * Seed MemberVote collection with roll call votes from bills since Jan 1, 2025.
 * Fetches all roll call votes from Congress.gov, parses Senate/House XML,
 * and bulk-upserts into MemberVote.
 *
 * Run with: npx tsx scripts/seed-member-votes.ts
 */
import mongoose from "mongoose";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.error("Could not read .env.local");
}

const CONGRESS_API = "https://api.congress.gov/v3";
const API_KEY = process.env.CONGRESS_KEY;
const MONGO_URI = process.env.DB_STRING;

const MemberVoteSchema = new mongoose.Schema({
  bioguideId: { type: String, required: true },
  billSlug: { type: String, required: true },
  congress: { type: String, required: true },
  vote: { type: String, required: true },
  chamber: { type: String, required: true },
  fetchedAt: { type: Date, default: Date.now },
});
MemberVoteSchema.index(
  { bioguideId: 1, billSlug: 1, congress: 1 },
  { unique: true }
);

const MemberVote =
  mongoose.models.MemberVote ||
  mongoose.model("MemberVote", MemberVoteSchema);

// Also create Bill model to store titles for non-community bills
const BillSchema = new mongoose.Schema({
  title: String,
  billSlug: String,
  congress: String,
  image: String,
  cloudinaryId: String,
  givenSummary: String,
  userSummary: String,
  yeas: { type: Number, default: 0 },
  nays: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const Bill =
  mongoose.models.Bill || mongoose.model("Bill", BillSchema);

function normalizeVote(vote: string): string {
  if (vote === "Aye") return "Yea";
  if (vote === "No") return "Nay";
  return vote;
}

/** Delay helper to respect API rate limits */
function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface RollCallVote {
  url: string;
  chamber: string;
  billSlug: string;
  congress: string;
  billTitle: string;
}

async function fetchBillsWithRollCalls(): Promise<RollCallVote[]> {
  const congress = 119; // 2025-2026
  const rollCalls: RollCallVote[] = [];
  const billTypes = ["hr", "s", "hjres", "sjres"];

  for (const billType of billTypes) {
    let offset = 0;
    const limit = 250;

    while (true) {
      const url = `${CONGRESS_API}/bill/${congress}/${billType}?limit=${limit}&offset=${offset}&fromDateTime=2025-01-01T00:00:00Z&sort=updateDate+desc&api_key=${API_KEY}&format=json`;
      console.log(`Fetching ${billType} bills offset=${offset}...`);

      const resp = await fetch(url);
      if (!resp.ok) {
        console.log(`  Failed: ${resp.status}`);
        break;
      }
      const data = await resp.json();
      const bills = data.bills || [];

      if (bills.length === 0) break;

      for (const b of bills) {
        const bType = (b.type || billType).toLowerCase();
        const bNumber = String(b.number || "");
        if (!bNumber) continue;

        const slug = `${bType}${bNumber}`;
        const billCongress = String(b.congress || congress);
        const title = b.title || "";

        // Fetch actions to find roll call votes
        await delay(200); // Rate limit
        try {
          const actionsUrl = `${CONGRESS_API}/bill/${billCongress}/${bType}/${bNumber}/actions?api_key=${API_KEY}&format=json&limit=50`;
          const actionsResp = await fetch(actionsUrl);
          if (!actionsResp.ok) continue;
          const actionsData = await actionsResp.json();
          const actions = actionsData.actions || [];

          for (const action of actions) {
            if (action.recordedVotes && action.recordedVotes.length > 0) {
              for (const rv of action.recordedVotes) {
                if (!rv.url) continue;
                const chamber = rv.url.includes("senate.gov")
                  ? "Senate"
                  : "House";
                rollCalls.push({
                  url: rv.url,
                  chamber,
                  billSlug: slug,
                  congress: billCongress,
                  billTitle: title,
                });
              }
            }
          }
        } catch (e) {
          console.log(`  Error fetching actions for ${slug}:`, e instanceof Error ? e.message : e);
        }
      }

      offset += limit;
      if (bills.length < limit) break;
      await delay(500);
    }
  }

  return rollCalls;
}

async function parseAndStoreRollCall(rv: RollCallVote): Promise<number> {
  const bulkOps: {
    updateOne: {
      filter: { bioguideId: string; billSlug: string; congress: string };
      update: {
        $set: { vote: string; chamber: string; fetchedAt: Date };
      };
      upsert: boolean;
    };
  }[] = [];

  try {
    const xmlResp = await fetch(rv.url);
    if (!xmlResp.ok) return 0;
    const xmlText = await xmlResp.text();

    if (rv.chamber === "Senate") {
      const memberRegex =
        /<member>[\s\S]*?<bioguide_id>([^<]+)<\/bioguide_id>[\s\S]*?<vote_cast>([^<]+)<\/vote_cast>[\s\S]*?<\/member>/gi;
      let match;
      while ((match = memberRegex.exec(xmlText)) !== null) {
        bulkOps.push({
          updateOne: {
            filter: {
              bioguideId: match[1].trim(),
              billSlug: rv.billSlug,
              congress: rv.congress,
            },
            update: {
              $set: {
                vote: normalizeVote(match[2].trim()),
                chamber: "Senate",
                fetchedAt: new Date(),
              },
            },
            upsert: true,
          },
        });
      }
    } else {
      const memberRegex =
        /name-id="([^"]+)"[^>]*>[\s\S]*?<vote>([^<]+)<\/vote>/gi;
      let match;
      while ((match = memberRegex.exec(xmlText)) !== null) {
        bulkOps.push({
          updateOne: {
            filter: {
              bioguideId: match[1].trim(),
              billSlug: rv.billSlug,
              congress: rv.congress,
            },
            update: {
              $set: {
                vote: normalizeVote(match[2].trim()),
                chamber: "House",
                fetchedAt: new Date(),
              },
            },
            upsert: true,
          },
        });
      }
    }
  } catch (e) {
    console.log(`  Error parsing XML ${rv.url}:`, e instanceof Error ? e.message : e);
    return 0;
  }

  if (bulkOps.length > 0) {
    await MemberVote.bulkWrite(bulkOps);
  }

  return bulkOps.length;
}

async function main() {
  if (!MONGO_URI) {
    console.error("No DB_STRING found in .env.local");
    process.exit(1);
  }
  if (!API_KEY) {
    console.error("No CONGRESS_KEY found in .env.local");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  console.log("Fetching bills with roll call votes since Jan 1, 2025...\n");
  const rollCalls = await fetchBillsWithRollCalls();

  // Deduplicate by URL (same roll call can appear on companion bills)
  const uniqueRollCalls = new Map<string, RollCallVote>();
  for (const rv of rollCalls) {
    const key = `${rv.url}|${rv.billSlug}`;
    if (!uniqueRollCalls.has(key)) {
      uniqueRollCalls.set(key, rv);
    }
  }

  console.log(`\nFound ${uniqueRollCalls.size} unique roll call votes across ${rollCalls.length} bill-vote pairs`);

  // Also store bill titles so the voting record page can display them
  const billTitles = new Map<string, { title: string; congress: string }>();
  for (const rv of uniqueRollCalls.values()) {
    if (rv.billTitle && !billTitles.has(rv.billSlug)) {
      billTitles.set(rv.billSlug, { title: rv.billTitle, congress: rv.congress });
    }
  }

  // Upsert bills (only set title, don't overwrite community vote data)
  const billBulkOps = [...billTitles.entries()].map(([slug, info]) => ({
    updateOne: {
      filter: { billSlug: slug },
      update: {
        $setOnInsert: {
          title: info.title,
          congress: info.congress,
          image: "/imgs/wtp.png",
          cloudinaryId: "",
          givenSummary: "",
          yeas: 0,
          nays: 0,
        },
      },
      upsert: true,
    },
  }));

  if (billBulkOps.length > 0) {
    const billResult = await Bill.bulkWrite(billBulkOps);
    console.log(`Bills: ${billResult.upsertedCount} new, ${billResult.modifiedCount} existing`);
  }

  let totalVotes = 0;
  let processed = 0;
  const total = uniqueRollCalls.size;

  for (const rv of uniqueRollCalls.values()) {
    processed++;
    if (processed % 10 === 0 || processed === total) {
      console.log(`Processing roll call ${processed}/${total}...`);
    }

    const count = await parseAndStoreRollCall(rv);
    totalVotes += count;

    await delay(200); // Rate limit XML fetches
  }

  console.log(`\nSeeded ${totalVotes} member vote records`);

  const uniqueMembers = await MemberVote.distinct("bioguideId");
  console.log(`Covering ${uniqueMembers.length} unique members`);

  await mongoose.disconnect();
  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
