import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBill extends Document {
  title: string;
  billSlug: string;
  congress: string;
  image: string;
  cloudinaryId: string;
  givenSummary: string;
  userSummary?: string;
  yeas: number;
  nays: number;
  createdAt: Date;
}

const BillSchema = new Schema<IBill>({
  title: {
    type: String,
    required: true,
  },
  billSlug: {
    type: String,
    required: true,
  },
  congress: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    default: "/imgs/wtp.png",
  },
  cloudinaryId: {
    type: String,
    default: "",
  },
  givenSummary: {
    type: String,
    required: false,
    default: "There is no ProPublica summary for this bill.",
  },
  userSummary: {
    type: String,
    required: false,
  },
  yeas: {
    type: Number,
    required: true,
  },
  nays: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Bill: Model<IBill> =
  mongoose.models.Bill || mongoose.model<IBill>("Bill", BillSchema);

export default Bill;
