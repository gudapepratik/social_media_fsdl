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

const storySchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    caption: { type: String, trim: true },
    media: { type: mediaSchema, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ authorId: 1, createdAt: -1 });

export type StoryDocument = InferSchemaType<typeof storySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const StoryModel = mongoose.model("Story", storySchema);

