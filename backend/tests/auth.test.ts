import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import "./setup.js";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { OrderModel } from "../src/models/order.model.js";
import { adminId, agentToken } from "./setup.js";

const app = createApp();

describe("auth and authorization", () => {
  it("rejects forged tokens that only pass jwt.decode", async () => {
    const forged = jwt.sign(
      { sub: adminId, role: "admin", email: "admin@example.com" },
      "wrong-secret",
      { algorithm: "HS256" },
    );

    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${forged}`);

    expect(res.status).toBe(401);
  });

  it("rejects unsigned / decode-only style tokens", async () => {
    const unsigned = Buffer.from(
      JSON.stringify({ alg: "none", typ: "JWT" }),
    ).toString("base64url") +
      "." +
      Buffer.from(
        JSON.stringify({ sub: adminId, role: "admin", email: "admin@example.com" }),
      ).toString("base64url") +
      ".";

    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${unsigned}`);

    expect(res.status).toBe(401);
  });

  it("does not accept a token from the query string", async () => {
    const res = await request(app).get(`/api/orders?token=${agentToken}`);
    expect(res.status).toBe(401);
  });

  it("rejects NoSQL injection on login", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@example.com",
        password: { $ne: null },
      });

    expect([400, 401]).toContain(res.status);
  });

  it("forbids agents from deleting orders", async () => {
    const order = await OrderModel.create({
      customerName: "Test Customer",
      customerNameLower: "test customer",
      customerEmail: "test@example.com",
      status: "pending",
      items: [{ productName: "Widget", quantity: 1, unitPriceCents: 1000 }],
      totalCents: 1000,
      createdAt: new Date(),
      createdBy: adminId,
    });

    const res = await request(app)
      .delete(`/api/orders/${order._id.toString()}`)
      .set("Authorization", `Bearer ${agentToken}`);

    expect(res.status).toBe(403);
    expect(await OrderModel.findById(order._id)).not.toBeNull();
  });

  it("signs tokens with the env secret and HS256", () => {
    const decoded = jwt.verify(agentToken, env.JWT_SECRET, {
      algorithms: ["HS256"],
    }) as { role: string };
    expect(decoded.role).toBe("agent");
  });
});
