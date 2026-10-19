import request from "supertest";
import { describe, expect, it } from "vitest";
import "./setup.js";
import { createApp } from "../src/app.js";
import { OrderModel } from "../src/models/order.model.js";
import { agentToken } from "./setup.js";

const app = createApp();

const baseBody = {
  customerName: "Ada Lovelace",
  customerEmail: "ada@example.com",
  items: [
    { productName: "Analytical Engine", quantity: 1, unitPriceCents: 50000 },
  ],
  totalCents: 50000,
  status: "pending" as const,
};

describe("order create idempotency", () => {
  it("creates exactly one order when the same request is fired twice in parallel", async () => {
    const key = crypto.randomUUID();

    const [first, second] = await Promise.all([
      request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${agentToken}`)
        .set("Idempotency-Key", key)
        .send(baseBody),
      request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${agentToken}`)
        .set("Idempotency-Key", key)
        .send(baseBody),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 201]);

    const ids = [first.body.order.id, second.body.order.id];
    expect(ids[0]).toBe(ids[1]);
    expect(await OrderModel.countDocuments({ idempotencyKey: key })).toBe(1);
  });

  it("creates exactly one order across 10 parallel identical requests", async () => {
    const key = crypto.randomUUID();

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app)
          .post("/api/orders")
          .set("Authorization", `Bearer ${agentToken}`)
          .set("Idempotency-Key", key)
          .send(baseBody),
      ),
    );

    const created = responses.filter((r) => r.status === 201);
    const replayed = responses.filter((r) => r.status === 200);
    expect(created).toHaveLength(1);
    expect(replayed).toHaveLength(9);

    const ids = new Set(responses.map((r) => r.body.order.id));
    expect(ids.size).toBe(1);
    expect(await OrderModel.countDocuments({ idempotencyKey: key })).toBe(1);
  });

  it("returns 422 when the same key is reused with a different body", async () => {
    const key = crypto.randomUUID();

    const first = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${agentToken}`)
      .set("Idempotency-Key", key)
      .send(baseBody);

    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${agentToken}`)
      .set("Idempotency-Key", key)
      .send({
        ...baseBody,
        totalCents: 60000,
        items: [
          {
            productName: "Analytical Engine",
            quantity: 1,
            unitPriceCents: 60000,
          },
        ],
      });

    expect(second.status).toBe(422);
    expect(await OrderModel.countDocuments({ idempotencyKey: key })).toBe(1);
  });

  it("rejects create without Idempotency-Key", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${agentToken}`)
      .send(baseBody);

    expect(res.status).toBe(400);
  });
});
