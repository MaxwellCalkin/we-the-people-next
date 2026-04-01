// models/BillVoteEvent.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBillVoteEventDoc extends Document {
  billSlug: string;
  congress: string;
  votedAt: Date;
}

const BillVoteEventSchema = new Schema<IBillVoteEventDoc>({
  billSlug: { type: String, required: true },
  congress: { type: String, required: true },
  votedAt: { type: Date, default: Date.now },
});

BillVoteEventSchema.index({ billSlug: 1, votedAt: -1 });
BillVoteEventSchema.index({ votedAt: -1 });

const BillVoteEvent: Model<IBillVoteEventDoc> =
  mongoose.models.BillVoteEvent ||
  mongoose.model<IBillVoteEventDoc>("BillVoteEvent", BillVoteEventSchema);

export default BillVoteEvent;
