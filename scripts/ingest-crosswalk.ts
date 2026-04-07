/**
 * Ingest the unitedstates/congress-legislators crosswalk into Mongo.
 *
 * Pulls bioguide ↔ FEC ↔ OpenSecrets identifiers so we can look up campaign
 * finance data for any member by their bioguide ID.
 *
 * Run with: npx tsx scripts/ingest-crosswalk.ts
 *
 * Source: https://github.com/unitedstates/congress-legislators (CC0).
 * Re-run when members join/leave Congress (≈ once per cycle, plus mid-cycle
 * resignations/appointments).
 */
import mongoose from "mongoose";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseLegislators, type LegislatorRecord } from "../lib/crosswalk";

// Load .env.local manually (matches the pattern in seed-member-scores.ts)
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
  process.exit(1);
}

import LegislatorCrosswalk from "../models/LegislatorCrosswalk";

const SOURCES = [
  "https://unitedstates.github.io/congress-legislators/legislators-current.json",
  "https://unitedstates.github.io/congress-legislators/legislators-historical.json",
];

async function main() {
  if (!process.env.DB_STRING) {
    console.error("DB_STRING not set");
    process.exit(1);
  }

  await mongoose.connect(process.env.DB_STRING);
  console.log("Connected to MongoDB");

  let totalUpserted = 0;
  let totalSkipped = 0;

  for (const url of SOURCES) {
    console.log(`Fetching ${url}...`);
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`  Failed: HTTP ${resp.status}`);
      continue;
    }
    const records = (await resp.json()) as LegislatorRecord[];
    console.log(`  Got ${records.length} records`);

    const rows = parseLegislators(records);
    console.log(`  Parsed ${rows.length} rows with bioguide IDs`);
    totalSkipped += records.length - rows.length;

    // Bulk upsert. We update on every run so historical members get refreshed
    // FEC IDs as new filings come in.
    const ops = rows.map((row) => ({
      updateOne: {
        filter: { bioguideId: row.bioguideId },
        update: {
          $set: {
            fecIds: row.fecIds,
            opensecretsId: row.opensecretsId,
            govtrackId: row.govtrackId,
            thomasId: row.thomasId,
            icpsrId: row.icpsrId,
            wikipediaTitle: row.wikipediaTitle,
            updatedAt: new Date(),
          },
          $setOnInsert: { bioguideId: row.bioguideId },
        },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      const result = await LegislatorCrosswalk.bulkWrite(ops);
      const upserted = (result.upsertedCount || 0) + (result.modifiedCount || 0);
      totalUpserted += upserted;
      console.log(`  Upserted ${upserted} rows`);
    }
  }

  console.log(`\nDone. Total upserted: ${totalUpserted}, skipped (no bioguide): ${totalSkipped}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
