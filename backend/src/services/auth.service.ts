import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { UserRole } from "../models/user.model.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/AppError.js";
import type { LoginInput } from "../validation/auth.schema.js";

const SALT_ROUNDS = 10;
const TOKEN_TTL = "8h";

export const authService = {
  async login(input: LoginInput): Promise<{ token: string }> {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new AppError(401, "Invalid email or password");
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        role: user.role as UserRole,
        email: user.email,
      },
      env.JWT_SECRET,
      { algorithm: "HS256", expiresIn: TOKEN_TTL },
    );

    return { token };
  },

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },
};
