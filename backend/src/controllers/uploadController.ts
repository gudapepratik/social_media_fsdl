import type { Request, Response } from "express";
import crypto from "crypto";
import { env } from "../config/env.js";

export function signUploadHandler(_req: Request, res: Response) {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return res.status(500).json({ error: { message: "Cloudinary not configured" } });
  }
  const timestamp = Math.round(Date.now() / 1000);
  const folder = "aveith";

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramsToSign + env.CLOUDINARY_API_SECRET)
    .digest("hex");

  return res.json({
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature
  });
}

