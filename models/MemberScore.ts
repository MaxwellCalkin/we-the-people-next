// models/MemberScore.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMemberScoreDoc extends Document {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district: number | null;
  chamber: string;
  communityScore: number | null;
  matchingVotes: number;
  totalCompared: number;
  updatedAt: Date;
}

const MemberScoreSchema = new Schema<IMemberScoreDoc>({
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

MemberScoreSchema.index({ communityScore: -1 });

const MemberScore: Model<IMemberScoreDoc> =
  mongoose.models.MemberScore ||
  mongoose.model<IMemberScoreDoc>("MemberScore", MemberScoreSchema);

export default MemberScore;
