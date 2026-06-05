// models/Proposal.ts
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IUpvoter {
  user: Types.ObjectId;
  state: string;
  cd: string;
}

export interface IProposal extends Document {
  title: string;
  description: string;
  image?: string;
  cloudinaryId?: string;
  user: Types.ObjectId;
  authorState: string;
  authorDistrict: string;
  upvoteCount: number;
  upvoters: IUpvoter[];
  upvotesByState: Map<string, number>;
  upvotesByDistrict: Map<string, number>;
  createdAt: Date;
}

const UpvoterSchema = new Schema<IUpvoter>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    state: { type: String, default: "" },
    cd: { type: String, default: "" },
  },
  { _id: false }
);

const ProposalSchema = new Schema<IProposal>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: false },
  cloudinaryId: { type: String, required: false },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  authorState: { type: String, default: "" },
  authorDistrict: { type: String, default: "" },
  upvoteCount: { type: Number, required: true, default: 0 },
  upvoters: { type: [UpvoterSchema], default: [] },
  upvotesByState: { type: Map, of: Number, default: {} },
  upvotesByDistrict: { type: Map, of: Number, default: {} },
  createdAt: { type: Date, default: Date.now },
});

ProposalSchema.index({ upvoteCount: -1 });
ProposalSchema.index({ authorState: 1, authorDistrict: 1, upvoteCount: -1 });
ProposalSchema.index({ createdAt: -1 });

const Proposal: Model<IProposal> =
  mongoose.models.Proposal || mongoose.model<IProposal>("Proposal", ProposalSchema);

export default Proposal;
