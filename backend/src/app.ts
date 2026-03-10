import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/authRoutes.js";
import { userRouter } from "./routes/userRoutes.js";
import { followRouter } from "./routes/followRoutes.js";
import { postRouter } from "./routes/postRoutes.js";
import { storyRouter } from "./routes/storyRoutes.js";
import { uploadRouter } from "./routes/uploadRoutes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true
    })
  );
  app.use(helmet());
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(morgan("dev"));

  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100
    })
  );
  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/follows", followRouter);
  app.use("/api", postRouter);
  app.use("/api/stories", storyRouter);
  app.use("/api/uploads", uploadRouter);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Routes will be mounted here in later todos.

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

