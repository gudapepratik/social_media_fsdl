import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { notFoundHandler } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/authRoutes.js";
import { userRouter } from "./routes/userRoutes.js";
import { followRouter } from "./routes/followRoutes.js";
import { postRouter } from "./routes/postRoutes.js";
import { storyRouter } from "./routes/storyRoutes.js";
import { uploadRouter } from "./routes/uploadRoutes.js";
import { env } from "./config/env.js";

export function createApp() {
  const app = express();
  const allowedOrigins = Array.from(
    new Set([env.CLIENT_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"])
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-retry"],
      optionsSuccessStatus: 204
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
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/follows", followRouter);
  app.use("/api", postRouter);
  app.use("/api/stories", storyRouter);
  app.use("/api/uploads", uploadRouter);

  // Routes will be mounted here in later todos.

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

