import mongoose, { type InferSchemaType } from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

commentSchema.index({ postId: 1, createdAt: -1 });

export type CommentDocument = InferSchemaType<typeof commentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CommentModel = mongoose.model("Comment", commentSchema);

