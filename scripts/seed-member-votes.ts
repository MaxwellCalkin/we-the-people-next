/**
 * Seed MemberVote collection with roll call votes since Jan 1, 2025.
 *
 * Strategy: Instead of iterating every bill (slow), fetch roll call vote
 * listings directly from Senate and House XML indexes, then parse each one.
 *
 * - Senate: https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_XXXXX.xml
 * - House: https://clerk.house.gov/evs/2025/rollNNN.xml
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
const Bill = mongoose.models.Bill || mongoose.model("Bill", BillSchema);

const MemberScoreSchema = new mongoose.Schema({
  bioguideId: { type: String, required: true, unique: true },
  name: String,
  party: String,
  state: String,
  district: { type: Number, default: null },
  chamber: String,
  communityScore: { type: Number, default: null },
  matchingVotes: { type: Number, default: 0 },
  totalCompared: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});
const MemberScoreModel =
  mongoose.models.MemberScore ||
  mongoose.model("MemberScore", MemberScoreSchema);

// Map senator last names to bioguide IDs (built from MemberScore collection)
let senatorNameMap: Map<string, string> = new Map();

async function buildSenatorNameMap(): Promise<void> {
  const senators = await MemberScoreModel.find({ chamber: "Senate" }).lean();
  for (const s of senators as { bioguideId: string; name: string }[]) {
    // name is like "Gillibrand, Kirsten E." — extract last name
    const lastName = s.name.split(",")[0].trim().toLowerCase();
    senatorNameMap.set(lastName, s.bioguideId);
  }
  console.log(`Built senator name map: ${senatorNameMap.size} senators`);
}

function normalizeVote(vote: string): string {
  if (vote === "Aye") return "Yea";
  if (vote === "No") return "Nay";
  return vote;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Parse a Senate roll call XML and extract bill info + all member votes.
 */
async function parseSenateVote(
  session: number,
  voteNumber: number
): Promise<{ billSlug: string; congress: string; title: string; votes: { bioguideId: string; vote: string }[] } | null> {
  const paddedVote = String(voteNumber).padStart(5, "0");
  const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote119${session}/vote_119_${session}_${paddedVote}.xml`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const xml = await resp.text();

    // Extract bill info
    let billSlug = "";
    let title = "";
    const congress = "119";

    // Try <document><document_name> for bill type+number
    const docMatch = xml.match(/<document_name>([^<]+)<\/document_name>/);
    if (docMatch) {
      // e.g. "H.R. 1234" or "S. 567" or "H.J.Res. 12"
      const docName = docMatch[1].trim();
      billSlug = docName
        .replace(/\.\s*/g, "")
        .replace(/\s+/g, "")
        .replace(/Res/i, "res")
        .replace(/^HR/i, "hr")
        .replace(/^S(?!res)/i, "s")
        .replace(/^HJ/i, "hj")
        .replace(/^SJ/i, "sj")
        .replace(/^HC/i, "hc")
        .replace(/^SC/i, "sc")
        .toLowerCase();
    }

    // Try <document><document_title>
    const titleMatch = xml.match(/<document_title>([^<]*)<\/document_title>/);
    if (titleMatch) title = titleMatch[1].trim();

    // Also try <question> for context
    if (!title) {
      const qMatch = xml.match(/<question>([^<]*)<\/question>/);
      if (qMatch) title = qMatch[1].trim();
    }

    if (!billSlug) return null; // Skip non-bill votes (nominations, etc.)

    // Extract member votes — Senate uses <member_full> and <lis_member_id>, not bioguide
    // Match by last name from <member_full> e.g. "Gillibrand (D-NY)"
    const votes: { bioguideId: string; vote: string }[] = [];
    const memberRegex = /<member>[\s\S]*?<member_full>([^<]+)<\/member_full>[\s\S]*?<vote_cast>([^<]+)<\/vote_cast>[\s\S]*?<\/member>/gi;
    let match;
    while ((match = memberRegex.exec(xml)) !== null) {
      const fullName = match[1].trim();
      // Extract last name: "Gillibrand (D-NY)" -> "gillibrand"
      const lastName = fullName.split(/\s*\(/)[0].trim().toLowerCase();
      const bioguideId = senatorNameMap.get(lastName);
      if (bioguideId) {
        votes.push({
          bioguideId,
          vote: normalizeVote(match[2].trim()),
        });
      }
    }

    return { billSlug, congress, title, votes };
  } catch {
    return null;
  }
}

/**
 * Parse a House roll call XML and extract bill info + all member votes.
 */
async function parseHouseVote(
  year: number,
  rollNumber: number
): Promise<{ billSlug: string; congress: string; title: string; votes: { bioguideId: string; vote: string }[] } | null> {
  const paddedRoll = String(rollNumber).padStart(3, "0");
  const url = `https://clerk.house.gov/evs/${year}/roll${paddedRoll}.xml`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const xml = await resp.text();

    // Extract bill info from <legis-num> like "H R 1234" or "H J RES 12"
    let billSlug = "";
    const congress = "119";

    const legisMatch = xml.match(/<legis-num>([^<]*)<\/legis-num>/);
    if (legisMatch) {
      const legis = legisMatch[1].trim();
      billSlug = legis
        .replace(/\s+/g, "")
        .replace(/JRES/i, "jres")
        .replace(/CONRES/i, "conres")
        .replace(/RES/i, "res")
        .replace(/^HR(?!es)/i, "hr")
        .replace(/^S(?!res|conres)/i, "s")
        .toLowerCase();
    }

    if (!billSlug) return null; // Skip procedural votes

    let title = "";
    const titleMatch = xml.match(/<vote-desc>([^<]*)<\/vote-desc>/);
    if (titleMatch) title = titleMatch[1].trim();

    // Extract member votes
    const votes: { bioguideId: string; vote: string }[] = [];
    const memberRegex = /name-id="([^"]+)"[^>]*>[\s\S]*?<vote>([^<]+)<\/vote>/gi;
    let match;
    while ((match = memberRegex.exec(xml)) !== null) {
      votes.push({
        bioguideId: match[1].trim(),
        vote: normalizeVote(match[2].trim()),
      });
    }

    return { billSlug, congress, title, votes };
  } catch {
    return null;
  }
}

async function main() {
  if (!MONGO_URI) {
    console.error("No DB_STRING found in .env.local");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB\n");

  await buildSenatorNameMap();

  let totalVotesStored = 0;
  let totalRollCalls = 0;
  const billTitles = new Map<string, string>();

  // --- SENATE VOTES ---
  // 119th Congress: Session 1 = 2025, Session 2 = 2026
  console.log("=== Fetching Senate roll call votes ===");
  for (const session of [1, 2]) {
    let voteNum = 1;
    let consecutive404s = 0;

    while (consecutive404s < 5) {
      const result = await parseSenateVote(session, voteNum);

      if (!result) {
        consecutive404s++;
        voteNum++;
        continue;
      }
      consecutive404s = 0;

      if (result.votes.length > 0) {
        const bulkOps = result.votes.map((v) => ({
          updateOne: {
            filter: { bioguideId: v.bioguideId, billSlug: result.billSlug, congress: result.congress },
            update: { $set: { vote: v.vote, chamber: "Senate", fetchedAt: new Date() } },
            upsert: true,
          },
        }));
        await MemberVote.bulkWrite(bulkOps);
        totalVotesStored += bulkOps.length;
        totalRollCalls++;

        if (result.title) billTitles.set(result.billSlug, result.title);

        if (totalRollCalls % 10 === 0) {
          console.log(`  Senate session ${session}, vote #${voteNum}: ${result.billSlug} (${result.votes.length} members)`);
        }
      }

      voteNum++;
      await delay(150);
    }
    console.log(`  Senate session ${session}: scanned ${voteNum - 1} votes`);
  }

  // --- HOUSE VOTES ---
  console.log("\n=== Fetching House roll call votes ===");
  for (const year of [2025, 2026]) {
    let rollNum = 1;
    let consecutive404s = 0;

    while (consecutive404s < 5) {
      const result = await parseHouseVote(year, rollNum);

      if (!result) {
        consecutive404s++;
        rollNum++;
        continue;
      }
      consecutive404s = 0;

      if (result.votes.length > 0) {
        const bulkOps = result.votes.map((v) => ({
          updateOne: {
            filter: { bioguideId: v.bioguideId, billSlug: result.billSlug, congress: result.congress },
            update: { $set: { vote: v.vote, chamber: "House", fetchedAt: new Date() } },
            upsert: true,
          },
        }));
        await MemberVote.bulkWrite(bulkOps);
        totalVotesStored += bulkOps.length;
        totalRollCalls++;

        if (result.title) billTitles.set(result.billSlug, result.title);

        if (totalRollCalls % 10 === 0) {
          console.log(`  House ${year}, roll #${rollNum}: ${result.billSlug} (${result.votes.length} members)`);
        }
      }

      rollNum++;
      await delay(150);
    }
    console.log(`  House ${year}: scanned ${rollNum - 1} rolls`);
  }

  // Store bill titles so voting record pages can display them
  if (billTitles.size > 0) {
    const billOps = [...billTitles.entries()].map(([slug, title]) => ({
      updateOne: {
        filter: { billSlug: slug },
        update: {
          $setOnInsert: {
            title,
            congress: "119",
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
    const billResult = await Bill.bulkWrite(billOps);
    console.log(`\nBills: ${billResult.upsertedCount} new titles stored`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Roll call votes processed: ${totalRollCalls}`);
  console.log(`Member vote records stored: ${totalVotesStored}`);

  const uniqueMembers = await MemberVote.distinct("bioguideId");
  console.log(`Unique members with votes: ${uniqueMembers.length}`);

  const uniqueBills = await MemberVote.distinct("billSlug");
  console.log(`Unique bills with votes: ${uniqueBills.length}`);

  await mongoose.disconnect();
  console.log("\nDone!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
