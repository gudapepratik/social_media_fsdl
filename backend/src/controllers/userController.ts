import type { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { UserModel } from "../models/User.js";
import { FollowModel } from "../models/Follow.js";

export async function getProfileHandler(req: Request, res: Response) {
  const { username } = req.params;

  const user = await UserModel.findOne({ username: username.toLowerCase() }).lean();
  if (!user) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  let isFollowing = false;
  if (req.userId && req.userId !== String(user._id)) {
    const exists = await FollowModel.exists({
      followerId: req.userId,
      followingId: user._id
    });
    isFollowing = !!exists;
  }

  return res.json({
    user: {
      id: String(user._id),
      username: user.username,
      name: user.name ?? "",
      bio: user.bio ?? "",
      avatarUrl: user.avatarUrl ?? "",
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      createdAt: user.createdAt
    },
    isFollowing
  });
}

const updateMeSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  bio: z.string().max(160).optional(),
  avatarUrl: z.string().url().optional(),
  avatarPublicId: z.string().optional()
});

export async function updateMeHandler(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
  try {
    const parsed = updateMeSchema.parse(req.body);
    const user = await UserModel.findByIdAndUpdate(
      req.userId,
      {
        $set: parsed
      },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: { message: "User not found" } });
    }
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name ?? "",
        bio: user.bio ?? "",
        avatarUrl: user.avatarUrl ?? "",
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { message: "Invalid input", details: err.issues } });
    }
    return res.status(500).json({ error: { message: "Internal Server Error" } });
  }
}

export async function searchUsersHandler(req: Request, res: Response) {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) {
    return res.json({ users: [] });
  }
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const users = await UserModel.find(
    { $or: [{ username: regex }, { name: regex }] },
    { username: 1, name: 1, avatarUrl: 1 }
  )
    .sort({ followersCount: -1 })
    .limit(20)
    .lean();
  return res.json({
    users: users.map((u) => ({
      id: String(u._id),
      username: u.username,
      name: u.name ?? "",
      avatarUrl: u.avatarUrl ?? ""
    }))
  });
}

export async function followersListHandler(req: Request, res: Response) {
  const { username } = req.params;
  const user = await UserModel.findOne({ username: username.toLowerCase() }).lean();
  if (!user) {
    return res.status(404).json({ error: { message: "User not found" } });
  }
  const followers = await FollowModel.find({ followingId: user._id })
    .populate("followerId", "username name avatarUrl")
    .lean();

  return res.json({
    users: followers.map((f) => {
      const follower = f.followerId as mongoose.AnyObject;
      return {
        id: String(follower._id),
        username: follower.username,
        name: follower.name ?? "",
        avatarUrl: follower.avatarUrl ?? ""
      };
    })
  });
}

export async function followingListHandler(req: Request, res: Response) {
  const { username } = req.params;
  const user = await UserModel.findOne({ username: username.toLowerCase() }).lean();
  if (!user) {
    return res.status(404).json({ error: { message: "User not found" } });
  }
  const following = await FollowModel.find({ followerId: user._id })
    .populate("followingId", "username name avatarUrl")
    .lean();

  return res.json({
    users: following.map((f) => {
      const followed = f.followingId as mongoose.AnyObject;
      return {
        id: String(followed._id),
        username: followed.username,
        name: followed.name ?? "",
        avatarUrl: followed.avatarUrl ?? ""
      };
    })
  });
}

