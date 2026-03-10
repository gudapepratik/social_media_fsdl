import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { followHandler, unfollowHandler } from "../controllers/followController.js";

export const followRouter = Router();

followRouter.post("/:userId", requireAuth, followHandler);
followRouter.delete("/:userId", requireAuth, unfollowHandler);

