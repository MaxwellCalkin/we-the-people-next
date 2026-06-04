import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IComment extends Document {
  comment: string;
  likes: number;
  proposal: Types.ObjectId;
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>({
  comment: {
    type: String,
    required: true,
  },
  likes: {
    type: Number,
    required: true,
  },
  proposal: {
    type: Schema.Types.ObjectId,
    ref: "Proposal",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Comment: Model<IComment> =
  mongoose.models.Comment ||
  mongoose.model<IComment>("Comment", CommentSchema);

export default Comment;
