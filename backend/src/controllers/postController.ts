import type { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { PostModel } from "../models/Post.js";
import { LikeModel } from "../models/Like.js";
import { CommentModel } from "../models/Comment.js";
import { FollowModel } from "../models/Follow.js";
import { UserModel } from "../models/User.js";

const mediaItemSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().url(),
  publicId: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional()
});

const createPostSchema = z.object({
  caption: z.string().max(2200).optional(),
  media: z.array(mediaItemSchema).min(1)
});

export async function createPostHandler(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
  try {
    const parsed = createPostSchema.parse(req.body);
    const post = await PostModel.create({
      authorId: req.userId,
      caption: parsed.caption ?? "",
      media: parsed.media
    });
    const populatedAuthor = await UserModel.findById(req.userId, "username name avatarUrl");
    return res.status(201).json({
      post: serializePost(post, populatedAuthor ?? undefined, false, 0)
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { message: "Invalid input", details: err.issues } });
    }
    return res.status(500).json({ error: { message: "Internal Server Error" } });
  }
}

export async function deletePostHandler(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
  const { postId } = req.params;
  const post = await PostModel.findOneAndDelete({ _id: postId, authorId: req.userId });
  if (!post) {
    return res.status(404).json({ error: { message: "Post not found" } });
  }
  await LikeModel.deleteMany({ postId: post._id });
  await CommentModel.deleteMany({ postId: post._id });
  return res.status(204).send();
}

export async function getPostHandler(req: Request, res: Response) {
  const { postId } = req.params;
  const post = await PostModel.findById(postId).lean();
  if (!post) {
    return res.status(404).json({ error: { message: "Post not found" } });
  }
  const author = await UserModel.findById(post.authorId, "username name avatarUrl").lean();
  let likedByMe = false;
  if (req.userId) {
    const like = await LikeModel.exists({ postId: post._id, userId: req.userId });
    likedByMe = !!like;
  }
  return res.json({
    post: serializePost(post, author ?? undefined, likedByMe, post.commentCount)
  });
}

const pageSize = 10;

export async function feedHandler(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
  const cursor = req.query.cursor as string | undefined;
  const cursorDate = cursor ? new Date(cursor) : undefined;

  const following = await FollowModel.find({ followerId: req.userId }, { followingId: 1 }).lean();
  const authorIds = following.map((f) => f.followingId);
  authorIds.push(new mongoose.Types.ObjectId(req.userId));

  const query: mongoose.FilterQuery<typeof PostModel> = { authorId: { $in: authorIds } };
  if (cursorDate) {
    query.createdAt = { $lt: cursorDate };
  }

  const posts = await PostModel.find(query)
    .sort({ createdAt: -1 })
    .limit(pageSize + 1)
    .lean();

  const hasMore = posts.length > pageSize;
  const slice = posts.slice(0, pageSize);
  const authorMap = await loadAuthors(slice);
  const likedSet = await loadLikesForUser(slice, req.userId);

  return res.json({
    items: slice.map((p) =>
      serializePost(p, authorMap.get(String(p.authorId)), likedSet.has(String(p._id)), p.commentCount)
    ),
    nextCursor: hasMore ? slice[slice.length - 1].createdAt.toISOString() : null
  });
}

export async function exploreHandler(req: Request, res: Response) {
  const cursor = req.query.cursor as string | undefined;
  const cursorDate = cursor ? new Date(cursor) : undefined;

  const query: mongoose.FilterQuery<typeof PostModel> = {};
  if (cursorDate) {
    query.createdAt = { $lt: cursorDate };
  }

  const posts = await PostModel.find(query)
    .sort({ createdAt: -1 })
    .limit(pageSize + 1)
    .lean();

  const hasMore = posts.length > pageSize;
  const slice = posts.slice(0, pageSize);
  const authorMap = await loadAuthors(slice);
  const likedSet = req.userId ? await loadLikesForUser(slice, req.userId) : new Set<string>();

  return res.json({
    items: slice.map((p) =>
      serializePost(p, authorMap.get(String(p.authorId)), likedSet.has(String(p._id)), p.commentCount)
    ),
    nextCursor: hasMore ? slice[slice.length - 1].createdAt.toISOString() : null
  });
}

export async function likePostHandler(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
  const { postId } = req.params;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const existing = await LikeModel.findOne({ postId, userId: req.userId }).session(session);
      if (existing) return;
      await LikeModel.create([{ postId, userId: req.userId }], { session });
      await PostModel.findByIdAndUpdate(postId, { $inc: { likeCount: 1 } }, { session });
    });
  } finally {
    await session.endSession();
  }
  return res.status(204).send();
}

export async function unlikePostHandler(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
  const { postId } = req.params;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const deleted = await LikeModel.findOneAndDelete({ postId, userId: req.userId }).session(session);
      if (!deleted) return;
      await PostModel.findByIdAndUpdate(postId, { $inc: { likeCount: -1 } }, { session });
    });
  } finally {
    await session.endSession();
  }
  return res.status(204).send();
}

const commentSchema = z.object({
  text: z.string().min(1).max(500)
});

export async function addCommentHandler(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
  const { postId } = req.params;
  try {
    const parsed = commentSchema.parse(req.body);
    const session = await mongoose.startSession();
    let created;
    try {
      await session.withTransaction(async () => {
        created = await CommentModel.create(
          [
            {
              postId,
              authorId: req.userId,
              text: parsed.text
            }
          ],
          { session }
        );
        await PostModel.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } }, { session });
      });
    } finally {
      await session.endSession();
    }
    const doc = created?.[0];
    if (!doc) {
      return res.status(500).json({ error: { message: "Unable to create comment" } });
    }
    return res.status(201).json({
      comment: {
        id: doc.id,
        postId: String(doc.postId),
        authorId: String(doc.authorId),
        text: doc.text,
        createdAt: doc.createdAt
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { message: "Invalid input", details: err.issues } });
    }
    return res.status(500).json({ error: { message: "Internal Server Error" } });
  }
}

export async function listCommentsHandler(req: Request, res: Response) {
  const { postId } = req.params;
  const cursor = req.query.cursor as string | undefined;
  const cursorDate = cursor ? new Date(cursor) : undefined;

  const query: mongoose.FilterQuery<typeof CommentModel> = { postId };
  if (cursorDate) {
    query.createdAt = { $lt: cursorDate };
  }
  const comments = await CommentModel.find(query)
    .sort({ createdAt: -1 })
    .limit(pageSize + 1)
    .lean();
  const hasMore = comments.length > pageSize;
  const slice = comments.slice(0, pageSize);

  const authorIds = Array.from(new Set(slice.map((c) => String(c.authorId))));
  const authors = await UserModel.find(
    { _id: { $in: authorIds } },
    { username: 1, name: 1, avatarUrl: 1 }
  ).lean();
  const authorMap = new Map<string, (typeof authors)[number]>();
  for (const a of authors) {
    authorMap.set(String(a._id), a);
  }

  return res.json({
    items: slice.map((c) => {
      const author = authorMap.get(String(c.authorId));
      return {
        id: String(c._id),
        postId: String(c.postId),
        text: c.text,
        createdAt: c.createdAt,
        author: author && {
          id: String(author._id),
          username: author.username,
          name: author.name ?? "",
          avatarUrl: author.avatarUrl ?? ""
        }
      };
    }),
    nextCursor: hasMore ? slice[slice.length - 1].createdAt.toISOString() : null
  });
}

async function loadAuthors(posts: Array<{ authorId: unknown }>) {
  const ids = Array.from(new Set(posts.map((p) => String(p.authorId))));
  const authors = await UserModel.find(
    { _id: { $in: ids } },
    { username: 1, name: 1, avatarUrl: 1 }
  ).lean();
  const map = new Map<string, (typeof authors)[number]>();
  for (const a of authors) {
    map.set(String(a._id), a);
  }
  return map;
}

async function loadLikesForUser(posts: Array<{ _id: unknown }>, userId: string) {
  const postIds = posts.map((p) => p._id);
  const likes = await LikeModel.find({ postId: { $in: postIds }, userId }, { postId: 1 }).lean();
  const set = new Set<string>();
  for (const l of likes) {
    set.add(String(l.postId));
  }
  return set;
}

function serializePost(
  post: any,
  author: any | undefined,
  likedByMe: boolean,
  commentCount: number
) {
  return {
    id: String(post._id),
    caption: post.caption ?? "",
    createdAt: post.createdAt,
    likeCount: post.likeCount ?? 0,
    commentCount,
    likedByMe,
    media: post.media ?? [],
    author: author && {
      id: String(author._id),
      username: author.username,
      name: author.name ?? "",
      avatarUrl: author.avatarUrl ?? ""
    }
  };
}

