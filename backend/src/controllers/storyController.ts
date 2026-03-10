import type { Request, Response } from "express";
import { z } from "zod";
import { StoryModel } from "../models/Story.js";
import { FollowModel } from "../models/Follow.js";
import { UserModel } from "../models/User.js";

const storyMediaSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().url(),
  publicId: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional()
});

const createStorySchema = z.object({
  caption: z.string().max(2200).optional(),
  media: storyMediaSchema
});

const STORY_TTL_HOURS = 24;

export async function createStoryHandler(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
  try {
    const parsed = createStorySchema.parse(req.body);
    const expiresAt = new Date(Date.now() + STORY_TTL_HOURS * 60 * 60 * 1000);
    const story = await StoryModel.create({
      authorId: req.userId,
      caption: parsed.caption ?? "",
      media: parsed.media,
      expiresAt
    });
    const author = await UserModel.findById(req.userId, "username name avatarUrl").lean();
    return res.status(201).json({
      story: serializeStory(story, author ?? undefined)
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { message: "Invalid input", details: err.issues } });
    }
    return res.status(500).json({ error: { message: "Internal Server Error" } });
  }
}

export async function storiesFeedHandler(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
  const following = await FollowModel.find({ followerId: req.userId }, { followingId: 1 }).lean();
  const authorIds = following.map((f) => f.followingId);
  authorIds.push(req.userId);

  const now = new Date();
  const stories = await StoryModel.find({
    authorId: { $in: authorIds },
    expiresAt: { $gt: now }
  })
    .sort({ createdAt: -1 })
    .lean();

  const grouped = await groupStoriesWithAuthors(stories);
  return res.json({ buckets: grouped });
}

export async function userStoriesHandler(req: Request, res: Response) {
  const { userId } = req.params;
  const now = new Date();
  const stories = await StoryModel.find({
    authorId: userId,
    expiresAt: { $gt: now }
  })
    .sort({ createdAt: -1 })
    .lean();

  const grouped = await groupStoriesWithAuthors(stories);
  return res.json({ buckets: grouped });
}

async function groupStoriesWithAuthors(stories: Array<{ authorId: unknown }>) {
  const ids = Array.from(new Set(stories.map((s) => String(s.authorId))));
  const authors = await UserModel.find(
    { _id: { $in: ids } },
    { username: 1, name: 1, avatarUrl: 1 }
  ).lean();
  const authorMap = new Map<string, (typeof authors)[number]>();
  for (const a of authors) {
    authorMap.set(String(a._id), a);
  }
  const byAuthor = new Map<string, any[]>();
  for (const s of stories) {
    const key = String(s.authorId);
    if (!byAuthor.has(key)) byAuthor.set(key, []);
    byAuthor.get(key)!.push(s);
  }
  const buckets: any[] = [];
  for (const [authorId, list] of byAuthor) {
    const author = authorMap.get(authorId);
    buckets.push({
      author: author && {
        id: String(author._id),
        username: author.username,
        name: author.name ?? "",
        avatarUrl: author.avatarUrl ?? ""
      },
      stories: list.map((s) => serializeStory(s, author))
    });
  }
  return buckets;
}

function serializeStory(story: any, author: any | undefined) {
  return {
    id: String(story._id),
    caption: story.caption ?? "",
    createdAt: story.createdAt,
    expiresAt: story.expiresAt,
    media: story.media,
    author: author && {
      id: String(author._id),
      username: author.username,
      name: author.name ?? "",
      avatarUrl: author.avatarUrl ?? ""
    }
  };
}

