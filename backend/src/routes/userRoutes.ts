import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  followersListHandler,
  followingListHandler,
  getProfileHandler,
  searchUsersHandler,
  updateMeHandler
} from "../controllers/userController.js";

export const userRouter = Router();

userRouter.get("/search", searchUsersHandler);
userRouter.get("/:username", getProfileHandler);
userRouter.patch("/me", requireAuth, updateMeHandler);
userRouter.get("/:username/followers", followersListHandler);
userRouter.get("/:username/following", followingListHandler);

