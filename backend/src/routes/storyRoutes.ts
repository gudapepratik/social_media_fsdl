import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createStoryHandler, storiesFeedHandler, userStoriesHandler } from "../controllers/storyController.js";

export const storyRouter = Router();

storyRouter.post("/", requireAuth, createStoryHandler);
storyRouter.get("/feed", requireAuth, storiesFeedHandler);
storyRouter.get("/:userId", userStoriesHandler);

