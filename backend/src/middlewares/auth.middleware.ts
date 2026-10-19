import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { UserRole } from "../models/user.model.js";
import type { AuthUser } from "../types/auth.js";
import { AppError } from "../utils/AppError.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    next(new AppError(401, "Missing token"));
    return;
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    next(new AppError(401, "Missing token"));
    return;
  }

  // Intentionally ignore query-string tokens — they leak into logs/history/Referer.
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    }) as AuthUser;
    req.user = {
      sub: payload.sub,
      role: payload.role,
      email: payload.email,
    };
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
}

export function requireRole(role: UserRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      next(new AppError(403, "Forbidden"));
      return;
    }
    next();
  };
}
