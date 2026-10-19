import type { Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import type { LoginInput } from "../validation/auth.schema.js";

export const authController = {
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body as LoginInput);
    res.json(result);
  },
};
