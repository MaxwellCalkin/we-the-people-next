// models/CandidateFinanceCache.ts
//
// Caches OpenFEC finance responses keyed by (fecId, cycle). Parallel to
// FecCache (which is keyed by bioguideId). The elections feature works with
// challengers who have no bioguide ID, so it caches against the FEC candidate
// ID directly. Same 24h TTL + Mongo TTL index pattern as FecCache.
import mongoose, { Document, Model, Schema } from "mongoose";
import type {
  CandidateTotals,
  ContributorAggregate,
  OutsideSpending,
} from "@/lib/fec";

export interface ICandidateFinanceCache extends Document {
  fecId: string;
  cycle: number;
  totals: CandidateTotals | null;
  topIndividuals: ContributorAggregate[];
  topPacs: ContributorAggregate[];
  outsideSpending: OutsideSpending | null;
  /**
   * true when the row was populated via the full fetcher (totals + top
   * individuals + top PACs + outside spending). false when only totals were
   * fetched — race list pages do this to stay under the FEC rate limit.
   * The candidate detail page treats hasFullDetails:false as a miss.
   */
  hasFullDetails: boolean;
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
  { contributor: String, amount: Number },
  { _id: false }
);

const OutsideSpenderSubSchema = new Schema(
  { name: String, amount: Number },
  { _id: false }
);

const OutsideSpendingSubSchema = new Schema(
  {
    supportTotal: Number,
    opposeTotal: Number,
    topSupporters: [OutsideSpenderSubSchema],
    topOpposers: [OutsideSpenderSubSchema],
  },
  { _id: false }
);

const CandidateFinanceCacheSchema = new Schema<ICandidateFinanceCache>({
  fecId: { type: String, required: true },
  cycle: { type: Number, required: true },
  totals: { type: CandidateTotalsSubSchema, default: null },
  topIndividuals: { type: [ContributorAggregateSubSchema], default: [] },
  topPacs: { type: [ContributorAggregateSubSchema], default: [] },
  outsideSpending: { type: OutsideSpendingSubSchema, default: null },
  hasFullDetails: { type: Boolean, default: false },
  fetchedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

CandidateFinanceCacheSchema.index({ fecId: 1, cycle: 1 }, { unique: true });
CandidateFinanceCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const CandidateFinanceCache: Model<ICandidateFinanceCache> =
  mongoose.models.CandidateFinanceCache ||
  mongoose.model<ICandidateFinanceCache>(
    "CandidateFinanceCache",
    CandidateFinanceCacheSchema
  );

export default CandidateFinanceCache;
