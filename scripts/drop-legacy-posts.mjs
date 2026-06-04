/**
 * One-time clean-slate cleanup for the proposals pivot.
 *
 * Drops the legacy `posts` collection and the `comments` collection (old
 * comments referenced posts). The new `proposals` collection starts empty.
 *
 * Run this ONCE against production *after* the proposals feature is deployed.
 * It is destructive: the dropped data is only recoverable from a database
 * backup/restore. Guarded by an explicit --confirm flag so it cannot run by
 * accident.
 *
 * Usage: node scripts/drop-legacy-posts.mjs --confirm
 */

import mongoose from "mongoose";
import { readFileSync } from "fs";

if (!process.argv.includes("--confirm")) {
  console.error("Refusing to run without --confirm");
  process.exit(1);
}

// DB_STRING may already be in the environment (e.g. CI / Vercel). Otherwise
// parse .env.local manually, matching the other scripts (no dotenv dependency).
let dbString = process.env.DB_STRING;
if (!dbString) {
  try {
    const envContent = readFileSync(".env.local", "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && match[1].trim() === "DB_STRING") {
        dbString = match[2].trim();
        break;
      }
    }
  } catch {
    // .env.local not present; fall through to the missing-var check below.
  }
}

if (!dbString) {
  console.error("DB_STRING is not set (env or .env.local)");
  process.exit(1);
}

await mongoose.connect(dbString);
for (const c of ["posts", "comments"]) {
  try {
    await mongoose.connection.db.dropCollection(c);
    console.log("dropped", c);
  } catch (e) {
    console.log("skip", c, e.codeName || e.message);
  }
}
await mongoose.disconnect();
