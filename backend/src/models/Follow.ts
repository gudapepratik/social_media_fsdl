import mongoose, { type InferSchemaType } from "mongoose";

const followSchema = new mongoose.Schema(
  {
    followerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    followingId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
followSchema.index({ followingId: 1 });

export type FollowDocument = InferSchemaType<typeof followSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FollowModel = mongoose.model("Follow", followSchema);

