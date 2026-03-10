import mongoose, { type InferSchemaType } from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

likeSchema.index({ postId: 1, userId: 1 }, { unique: true });
likeSchema.index({ userId: 1 });

export type LikeDocument = InferSchemaType<typeof likeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LikeModel = mongoose.model("Like", likeSchema);

