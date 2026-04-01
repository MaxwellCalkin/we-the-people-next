// models/MemberVote.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMemberVoteDoc extends Document {
  bioguideId: string;
  billSlug: string;
  congress: string;
  vote: string;
  chamber: string;
  fetchedAt: Date;
}

const MemberVoteSchema = new Schema<IMemberVoteDoc>({
  bioguideId: { type: String, required: true },
  billSlug: { type: String, required: true },
  congress: { type: String, required: true },
  vote: { type: String, required: true },
  chamber: { type: String, required: true },
  fetchedAt: { type: Date, default: Date.now },
});

MemberVoteSchema.index(
  { bioguideId: 1, billSlug: 1, congress: 1 },
  { unique: true }
);

const MemberVote: Model<IMemberVoteDoc> =
  mongoose.models.MemberVote ||
  mongoose.model<IMemberVoteDoc>("MemberVote", MemberVoteSchema);

export default MemberVote;
