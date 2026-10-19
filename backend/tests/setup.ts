import { afterAll, beforeAll, beforeEach } from "vitest";
import { connectDb, disconnectDb } from "../src/config/db.js";
import { OrderModel } from "../src/models/order.model.js";
import { UserModel } from "../src/models/user.model.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { authService } from "../src/services/auth.service.js";
import { env } from "../src/config/env.js";

export let adminToken = "";
export let agentToken = "";
export let adminId = "";
export let agentId = "";

beforeAll(async () => {
  await connectDb(env.MONGO_URL);
  await OrderModel.syncIndexes();
  await UserModel.syncIndexes();
});

beforeEach(async () => {
  await OrderModel.deleteMany({});
  await UserModel.deleteMany({});

  const admin = await userRepository.create({
    email: "admin@example.com",
    passwordHash: await authService.hashPassword("admin123"),
    role: "admin",
  });
  const agent = await userRepository.create({
    email: "agent@example.com",
    passwordHash: await authService.hashPassword("agent123"),
    role: "agent",
  });

  adminId = admin._id.toString();
  agentId = agent._id.toString();
  adminToken = (
    await authService.login({
      email: "admin@example.com",
      password: "admin123",
    })
  ).token;
  agentToken = (
    await authService.login({
      email: "agent@example.com",
      password: "agent123",
    })
  ).token;
});

afterAll(async () => {
  await disconnectDb();
});
