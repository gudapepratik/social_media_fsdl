import mongoose, { type InferSchemaType } from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["image", "video"], required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number }
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    caption: { type: String, trim: true },
    media: { type: [mediaSchema], required: true },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

export type PostDocument = InferSchemaType<typeof postSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PostModel = mongoose.model("Post", postSchema);

