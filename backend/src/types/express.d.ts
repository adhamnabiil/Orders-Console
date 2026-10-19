import type { UserRole } from "../models/user.model.js";

export type AuthUser = {
  sub: string;
  role: UserRole;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
