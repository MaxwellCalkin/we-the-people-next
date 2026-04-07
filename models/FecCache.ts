// models/FecCache.ts
//
// Caches OpenFEC API responses by (bioguideId, cycle) with a 24-hour TTL.
// Mongo's TTL index auto-deletes expired documents in the background, so we
// also store fetchedAt for an explicit freshness check (defense in depth).
//
// One document per member per cycle holds all three responses we fetch on a
// member profile load: candidate totals, top individual contributions, and
// top PAC contributions.
import mongoose, { Document, Model, Schema } from "mongoose";
import type { CandidateTotals, ContributorAggregate } from "@/lib/fec";

export interface IFecCache extends Document {
  bioguideId: string;
  cycle: number;
  totals: CandidateTotals | null;
  topIndividuals: ContributorAggregate[];
  topPacs: ContributorAggregate[];
  fetchedAt: Date;
  expiresAt: Date;
}

const CandidateTotalsSubSchema = new Schema(
  {
    candidateId: String,
    cycle: Number,
    receipts: Number,
    disbursements: Number,
    cashOnHand: Number,
    individualContributions: Number,
    pacContributions: Number,
    coverageEndDate: { type: String, default: null },
  },
  { _id: false }
);

const ContributorAggregateSubSchema = new Schema(
  {
    contributor: String,
    amount: Number,
  },
  { _id: false }
);

const FecCacheSchema = new Schema<IFecCache>({
  bioguideId: { type: String, required: true },
  cycle: { type: Number, required: true },
  totals: { type: CandidateTotalsSubSchema, default: null },
  topIndividuals: { type: [ContributorAggregateSubSchema], default: [] },
  topPacs: { type: [ContributorAggregateSubSchema], default: [] },
  fetchedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

// Composite unique index for one cache row per member per cycle
FecCacheSchema.index({ bioguideId: 1, cycle: 1 }, { unique: true });

// Mongo TTL index — documents are auto-removed when expiresAt is in the past.
// expireAfterSeconds: 0 means "delete as soon as expiresAt has passed."
FecCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const FecCache: Model<IFecCache> =
  mongoose.models.FecCache || mongoose.model<IFecCache>("FecCache", FecCacheSchema);

export default FecCache;
