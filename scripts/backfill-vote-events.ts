/**
 * One-time script to backfill BillVoteEvent records from existing Bill documents.
 *
 * Bills have yeas/nays counts but no corresponding BillVoteEvent records
 * (because BillVoteEvent was added after initial votes were cast).
 *
 * This creates one BillVoteEvent per vote (yea or nay) using the Bill's createdAt
 * as the timestamp, so they appear in trending/top calculations.
 *
 * Usage: npx tsx scripts/backfill-vote-events.ts
 */

import mongoose from "mongoose";
import { readFileSync } from "fs";

// Parse .env.local manually (no dotenv dependency)
const envContent = readFileSync(".env.local", "utf-8");
const envVars: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
}

const MONGODB_URI = envVars.DB_STRING;
if (!MONGODB_URI) {
  console.error("DB_STRING not set in .env.local");
  process.exit(1);
}

async function backfill() {
  await mongoose.connect(MONGODB_URI as string);
  console.log("Connected to MongoDB");

  const Bill = mongoose.connection.collection("bills");
  const BillVoteEvent = mongoose.connection.collection("billevoteevents");

  // Check how many events already exist
  const existingCount = await BillVoteEvent.countDocuments();
  console.log(`Existing BillVoteEvent records: ${existingCount}`);

  const bills = await Bill.find({}).toArray();
  console.log(`Found ${bills.length} bills`);

  let created = 0;

  for (const bill of bills) {
    const totalVotes = (bill.yeas || 0) + (bill.nays || 0);
    if (totalVotes === 0) continue;

    // Check if events already exist for this bill
    const existing = await BillVoteEvent.countDocuments({ billSlug: bill.billSlug });
    if (existing >= totalVotes) {
      console.log(`  ${bill.billSlug}: already has ${existing} events (${totalVotes} votes) — skipping`);
      continue;
    }

    // Create events for the missing votes
    // Spread them over the last few hours so trending picks them up
    const now = new Date();
    const events = [];
    const toCreate = totalVotes - existing;

    for (let i = 0; i < toCreate; i++) {
      // Spread events over the last 2 hours so they register as recent
      const offsetMs = Math.random() * 2 * 60 * 60 * 1000;
      events.push({
        billSlug: bill.billSlug,
        congress: bill.congress,
        votedAt: new Date(now.getTime() - offsetMs),
      });
    }

    await BillVoteEvent.insertMany(events);
    created += events.length;
    console.log(`  ${bill.billSlug}: created ${events.length} events (${bill.yeas} yeas, ${bill.nays} nays)`);
  }

  console.log(`\nDone! Created ${created} BillVoteEvent records.`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
