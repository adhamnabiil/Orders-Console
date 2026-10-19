import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authController } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { loginSchema } from "../validation/auth.schema.js";

export const authRoutes = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, try again later" },
});

authRoutes.post(
  "/login",
  loginLimiter,
  validate(loginSchema, "body"),
  (req, res, next) => {
    authController.login(req, res).catch(next);
  },
);
