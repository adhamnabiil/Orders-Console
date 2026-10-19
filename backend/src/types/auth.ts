import type { UserRole } from "../models/user.model.js";

export type AuthUser = {
  sub: string;
  role: UserRole;
  email: string;
};
