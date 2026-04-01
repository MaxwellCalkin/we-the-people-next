/**
 * Seed MemberScore collection with all current members of Congress.
 * Run with: npx tsx scripts/seed-member-scores.ts
 */
import mongoose from "mongoose";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually (no dotenv dependency needed)
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

const MemberScoreSchema = new mongoose.Schema({
  bioguideId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  party: { type: String, required: true },
  state: { type: String, required: true },
  district: { type: Number, default: null },
  chamber: { type: String, required: true },
  communityScore: { type: Number, default: null },
  matchingVotes: { type: Number, default: 0 },
  totalCompared: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

const MemberScore =
  mongoose.models.MemberScore ||
  mongoose.model("MemberScore", MemberScoreSchema);

async function fetchAllMembers(): Promise<
  { bioguideId: string; name: string; party: string; state: string; district?: number; chamber: string }[]
> {
  const members: { bioguideId: string; name: string; party: string; state: string; district?: number; chamber: string }[] = [];
  let offset = 0;
  const limit = 250;

  while (true) {
    const url = `${CONGRESS_API}/member?currentMember=true&limit=${limit}&offset=${offset}&api_key=${API_KEY}&format=json`;
    const resp = await fetch(url);
    const data = await resp.json();
    const batch = data.members || [];

    if (batch.length === 0) break;

    for (const m of batch) {
      const terms = m.terms?.item || m.terms || [];
      const latestTerm = Array.isArray(terms) ? terms[terms.length - 1] : null;
      const chamber = latestTerm?.chamber === "Senate" ? "Senate" : "House";

      members.push({
        bioguideId: m.bioguideId || "",
        name: m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim(),
        party: m.partyName || "",
        state: m.state || "",
        district: m.district || undefined,
        chamber,
      });
    }

    offset += limit;
    if (batch.length < limit) break;
  }

  return members;
}

async function main() {
  if (!MONGO_URI) {
    console.error("No DB_STRING found in .env.local");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  console.log("Fetching all current members from Congress.gov...");
  const members = await fetchAllMembers();
  console.log(`Found ${members.length} members`);

  const bulkOps = members
    .filter((m) => m.bioguideId)
    .map((m) => ({
      updateOne: {
        filter: { bioguideId: m.bioguideId },
        update: {
          $setOnInsert: {
            communityScore: null,
            matchingVotes: 0,
            totalCompared: 0,
          },
          $set: {
            name: m.name,
            party: m.party,
            state: m.state,
            district: m.district || null,
            chamber: m.chamber,
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

  const result = await MemberScore.bulkWrite(bulkOps);
  console.log(
    `Seeded: ${result.upsertedCount} new, ${result.modifiedCount} updated`
  );

  await mongoose.disconnect();
  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
