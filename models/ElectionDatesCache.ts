// models/ElectionDatesCache.ts
//
// Caches /election-dates/ results keyed by (scope, electionYear) where scope
// is either "national" or a two-letter state code. Election dates rarely
// change once published, so this gets a 7-day TTL — much longer than the
// 24h used for candidate finance.
import mongoose, { Document, Model, Schema } from "mongoose";
import type { ElectionDate } from "@/lib/fec";

export interface IElectionDatesCache extends Document {
  scope: string;
  electionYear: number;
  dates: ElectionDate[];
  fetchedAt: Date;
  expiresAt: Date;
}

const ElectionDateSubSchema = new Schema<ElectionDate>(
  {
    state: { type: String, default: null },
    office: { type: String, default: null },
    district: { type: String, default: null },
    party: { type: String, default: null },
    type: { type: String, required: true },
    date: { type: String, required: true },
  },
  { _id: false }
);

const ElectionDatesCacheSchema = new Schema<IElectionDatesCache>({
  scope: { type: String, required: true },
  electionYear: { type: Number, required: true },
  dates: { type: [ElectionDateSubSchema], default: [] },
  fetchedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

ElectionDatesCacheSchema.index({ scope: 1, electionYear: 1 }, { unique: true });
ElectionDatesCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ElectionDatesCache: Model<IElectionDatesCache> =
  mongoose.models.ElectionDatesCache ||
  mongoose.model<IElectionDatesCache>(
    "ElectionDatesCache",
    ElectionDatesCacheSchema
  );

export default ElectionDatesCache;
