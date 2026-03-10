import jwt from "jsonwebtoken";
import { env } from "./env.js";

type JwtPayloadBase = {
  sub: string;
  type: "access" | "refresh";
};

export function signAccessToken(userId: string) {
  const payload: JwtPayloadBase = { sub: userId, type: "access" };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL_SECONDS
  });
}

export function signRefreshToken(userId: string) {
  const payload: JwtPayloadBase = { sub: userId, type: "refresh" };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL_SECONDS
  });
}

export function verifyAccessToken(token: string): JwtPayloadBase {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayloadBase;
  if (decoded.type !== "access") {
    throw new Error("Invalid token type");
  }
  return decoded;
}

export function verifyRefreshToken(token: string): JwtPayloadBase {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayloadBase;
  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }
  return decoded;
}

