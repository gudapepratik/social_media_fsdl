import mongoose, { type InferSchemaType } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, trim: true },
    bio: { type: String, trim: true },
    avatarUrl: { type: String },
    avatarPublicId: { type: String },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
); 

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserModel = mongoose.model("User", userSchema);

