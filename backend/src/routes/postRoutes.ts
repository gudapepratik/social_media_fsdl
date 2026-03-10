import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  addCommentHandler,
  createPostHandler,
  deletePostHandler,
  exploreHandler,
  feedHandler,
  getPostHandler,
  likePostHandler,
  listCommentsHandler,
  unlikePostHandler
} from "../controllers/postController.js";

export const postRouter = Router();

postRouter.post("/", requireAuth, createPostHandler);
postRouter.get("/feed", requireAuth, feedHandler);
postRouter.get("/explore", exploreHandler);

postRouter.get("/:postId", getPostHandler);
postRouter.delete("/:postId", requireAuth, deletePostHandler);
postRouter.post("/:postId/like", requireAuth, likePostHandler);
postRouter.delete("/:postId/like", requireAuth, unlikePostHandler);

postRouter.post("/:postId/comments", requireAuth, addCommentHandler);
postRouter.get("/:postId/comments", listCommentsHandler);

