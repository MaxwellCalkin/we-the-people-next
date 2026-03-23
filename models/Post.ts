import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IPost extends Document {
  title: string;
  billSlug: string;
  billCongress: string;
  image: string;
  cloudinaryId: string;
  caption: string;
  likes: number;
  user: Types.ObjectId;
  createdAt: Date;
}

const PostSchema = new Schema<IPost>({
  title: {
    type: String,
    required: true,
  },
  billSlug: {
    type: String,
    required: true,
  },
  billCongress: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  cloudinaryId: {
    type: String,
    required: true,
  },
  caption: {
    type: String,
    required: true,
  },
  likes: {
    type: Number,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Post: Model<IPost> =
  mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);

export default Post;
