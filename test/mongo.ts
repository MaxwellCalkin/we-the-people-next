// test/mongo.ts — ephemeral real MongoDB for integration tests.
// Honors CLAUDE.md ("real MongoDB, no mocking") without touching any shared
// cluster: each test file that calls setupTestMongo() gets its own in-process
// mongod, with DB_STRING pointed at it for the duration of the file.
import { beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// lib/db caches the connection on globalThis.mongooseCache and binds a
// module-scoped `cached` to that same object. We MUTATE it (rather than
// reassign) so the reset is visible to lib/db's reference too, preventing a
// stopped in-memory connection from leaking into the next test file that runs
// in the same worker.
function resetConnectionCache() {
  const g = globalThis as { mongooseCache?: { conn: unknown; promise: unknown } };
  if (g.mongooseCache) {
    g.mongooseCache.conn = null;
    g.mongooseCache.promise = null;
  }
}

export function setupTestMongo() {
  let mongod: MongoMemoryServer | undefined;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.DB_STRING = mongod.getUri();
    resetConnectionCache();
  }, 120_000); // first run may download the mongod binary

  afterAll(async () => {
    await mongoose.disconnect().catch(() => {});
    resetConnectionCache();
    if (mongod) await mongod.stop();
  });
}
