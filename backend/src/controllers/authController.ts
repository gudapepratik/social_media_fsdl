import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserModel } from "../models/User.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../config/jwt.js";
import { env } from "../config/env.js";

const credentialsSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/)
    .toLowerCase(),
  password: z.string().min(6).max(100),
  name: z.string().min(1).max(50)
});

export async function registerHandler(req: Request, res: Response) {
  try {
    const parsed = credentialsSchema.parse(req.body);

    const existing = await UserModel.findOne({
      $or: [{ email: parsed.email.toLowerCase() }, { username: parsed.username }]
    }).lean();
    if (existing) {
      return res.status(409).json({ error: { message: "Email or username already in use" } });
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const user = await UserModel.create({
      email: parsed.email.toLowerCase(),
      username: parsed.username,
      passwordHash,
      name: parsed.name
    });

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      accessToken,
      user: serializeUser(user)
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { message: "Invalid input", details: err.issues } });
    }
    return res.status(500).json({ error: { message: "Internal Server Error" } });
  }
}

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1)
});

export async function loginHandler(req: Request, res: Response) {
  try {
    const parsed = loginSchema.parse(req.body);

    const identifier = parsed.emailOrUsername.toLowerCase();
    const user = await UserModel.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) {
      return res.status(401).json({ error: { message: "Invalid credentials" } });
    }

    const ok = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: { message: "Invalid credentials" } });
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    setRefreshCookie(res, refreshToken);

    return res.json({
      accessToken,
      user: serializeUser(user)
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { message: "Invalid input", details: err.issues } });
    }
    return res.status(500).json({ error: { message: "Internal Server Error" } });
  }
}

export async function logoutHandler(_req: Request, res: Response) {
  clearRefreshCookie(res);
  return res.status(204).send();
}

export async function refreshHandler(req: Request, res: Response) {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) {
      return res.status(401).json({ error: { message: "Unauthorized" } });
    }

    const payload = verifyRefreshToken(token);
    const user = await UserModel.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: { message: "Unauthorized" } });
    }

    const newAccess = signAccessToken(user.id);
    const newRefresh = signRefreshToken(user.id);
    setRefreshCookie(res, newRefresh);

    return res.json({
      accessToken: newAccess,
      user: serializeUser(user)
    });
  } catch {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
}

export async function meHandler(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
  const user = await UserModel.findById(req.userId);
  if (!user) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
  return res.json({ user: serializeUser(user) });
}

function serializeUser(user: { id: string; username: string; email: string; name?: string | null; bio?: string | null; avatarUrl?: string | null }) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name ?? "",
    bio: user.bio ?? "",
    avatarUrl: user.avatarUrl ?? ""
  };
}

function setRefreshCookie(res: Response, token: string) {
  const secure = env.NODE_ENV === "production";
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: env.JWT_REFRESH_TTL_SECONDS * 1000
  });
}

function clearRefreshCookie(res: Response) {
  const secure = env.NODE_ENV === "production";
  res.cookie("refresh_token", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0
  });
}

