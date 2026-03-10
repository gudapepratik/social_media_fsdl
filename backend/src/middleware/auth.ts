import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../config/jwt.js";
import { UserModel } from "../models/User.js";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: { message: "Unauthorized" } });
    }
    const token = header.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    const userExists = await UserModel.exists({ _id: payload.sub });
    if (!userExists) {
      return res.status(401).json({ error: { message: "Unauthorized" } });
    }

    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
}

