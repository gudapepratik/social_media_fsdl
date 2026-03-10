import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { signUploadHandler } from "../controllers/uploadController.js";

export const uploadRouter = Router();

uploadRouter.post("/sign", requireAuth, signUploadHandler);

