// models/ElectionRosterCache.ts
//
// Caches the list of federal candidates for a given race (state, office,
// district, cycle). The OpenFEC /candidates/ list endpoint is paginated and
// not free of rate limit pressure, so we hold the roster for 24h. Finance
// data for each candidate is cached separately in CandidateFinanceCache.
//
// district is always present (use "" for Senate / President) so the unique
// index has a stable shape.
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRosterCandidate {
  fecId: string;
  name: string;
  party: string | null;
  incumbentChallenge: "I" | "C" | "O" | null;
}

export interface IElectionRosterCache extends Document {
  state: string;
  office: "H" | "S" | "P";
  district: string;
  cycle: number;
  candidates: IRosterCandidate[];
  fetchedAt: Date;
  expiresAt: Date;
}

const RosterCandidateSubSchema = new Schema<IRosterCandidate>(
  {
    fecId: { type: String, required: true },
    name: { type: String, required: true },
    party: { type: String, default: null },
    incumbentChallenge: { type: String, default: null },
  },
  { _id: false }
);

const ElectionRosterCacheSchema = new Schema<IElectionRosterCache>({
  state: { type: String, required: true },
  office: { type: String, required: true },
  district: { type: String, required: true, default: "" },
  cycle: { type: Number, required: true },
  candidates: { type: [RosterCandidateSubSchema], default: [] },
  fetchedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

ElectionRosterCacheSchema.index(
  { state: 1, office: 1, district: 1, cycle: 1 },
  { unique: true }
);
ElectionRosterCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ElectionRosterCache: Model<IElectionRosterCache> =
  mongoose.models.ElectionRosterCache ||
  mongoose.model<IElectionRosterCache>(
    "ElectionRosterCache",
    ElectionRosterCacheSchema
  );

export default ElectionRosterCache;
