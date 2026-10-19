import { Router } from "express";
import { authRoutes } from "./auth.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

apiRouter.use("/auth", authRoutes);
