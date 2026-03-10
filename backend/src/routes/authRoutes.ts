import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { loginHandler, logoutHandler, meHandler, refreshHandler, registerHandler } from "../controllers/authController.js";

export const authRouter = Router();

authRouter.post("/register", registerHandler);
authRouter.post("/login", loginHandler);
authRouter.post("/logout", logoutHandler);
authRouter.post("/refresh", refreshHandler);
authRouter.get("/me", requireAuth, meHandler);

