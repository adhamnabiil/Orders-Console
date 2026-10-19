import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

export function latencyMiddleware(req: Request, _res: Response, next: NextFunction) {
  const ms = env.SIMULATE_LATENCY_MS;
  if (!ms || ms <= 0) {
    next();
    return;
  }

  // Only delay list GETs so create/auth stay snappy.
  if (req.method === "GET" && req.path === "/") {
    const delay = Math.floor(Math.random() * ms);
    setTimeout(next, delay);
    return;
  }

  next();
}
