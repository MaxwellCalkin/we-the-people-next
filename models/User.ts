import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  userName: string;
  email: string;
  password: string;
  state: string;
  cd: string;
  yeaBillSlugs: string[];
  nayBillSlugs: string[];
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  userName: { type: String, unique: true },
  email: { type: String, unique: true },
  password: String,
  state: { type: String },
  cd: { type: String },
  yeaBillSlugs: { type: [String], required: false, default: [] },
  nayBillSlugs: { type: [String], required: false, default: [] },
});

// Password hash middleware
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Helper method for validating user's password
UserSchema.methods.comparePassword = function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
