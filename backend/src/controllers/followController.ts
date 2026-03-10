import type { Request, Response } from "express";
import mongoose from "mongoose";
import { FollowModel } from "../models/Follow.js";
import { UserModel } from "../models/User.js";

export async function followHandler(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
  const { userId } = req.params;
  if (userId === req.userId) {
    return res.status(400).json({ error: { message: "Cannot follow yourself" } });
  }
  const target = await UserModel.findById(userId);
  if (!target) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const existing = await FollowModel.findOne({
        followerId: req.userId,
        followingId: userId
      }).session(session);
      if (existing) return;

      await FollowModel.create(
        [
          {
            followerId: req.userId,
            followingId: userId
          }
        ],
        { session }
      );
      await UserModel.findByIdAndUpdate(
        req.userId,
        { $inc: { followingCount: 1 } },
        { session }
      );
      await UserModel.findByIdAndUpdate(
        userId,
        { $inc: { followersCount: 1 } },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  return res.status(204).send();
}

export async function unfollowHandler(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
  const { userId } = req.params;
  if (userId === req.userId) {
    return res.status(400).json({ error: { message: "Cannot unfollow yourself" } });
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const deleted = await FollowModel.findOneAndDelete({
        followerId: req.userId,
        followingId: userId
      }).session(session);
      if (!deleted) return;

      await UserModel.findByIdAndUpdate(
        req.userId,
        { $inc: { followingCount: -1 } },
        { session }
      );
      await UserModel.findByIdAndUpdate(
        userId,
        { $inc: { followersCount: -1 } },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  return res.status(204).send();
}

