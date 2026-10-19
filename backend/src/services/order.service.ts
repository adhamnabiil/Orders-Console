import { createHash } from "node:crypto";
import mongoose from "mongoose";
import type { OrderDocument } from "../models/order.model.js";
import { orderRepository } from "../repositories/order.repository.js";
import type { AuthUser } from "../types/auth.js";
import { AppError } from "../utils/AppError.js";
import type {
  CreateOrderInput,
  ListOrdersQuery,
} from "../validation/order.schema.js";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function requestHashFor(input: CreateOrderInput): string {
  const payload = JSON.stringify({
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail.trim().toLowerCase(),
    items: input.items,
    totalCents: input.totalCents,
    status: input.status,
  });
  return createHash("sha256").update(payload).digest("hex");
}

function computeTotalCents(items: CreateOrderInput["items"]): number {
  return items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );
}

function toPublicOrder(order: OrderDocument) {
  return {
    id: order._id.toString(),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    status: order.status,
    items: order.items,
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    createdBy: order.createdBy.toString(),
  };
}

export const orderService = {
  async list(query: ListOrdersQuery) {
    const filter: Record<string, unknown> = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.q) {
      const prefix = new RegExp(`^${escapeRegex(query.q.toLowerCase())}`);
      filter.$or = [
        { customerNameLower: prefix },
        { customerEmail: prefix },
      ];
    }

    const sortDir = query.dir === "asc" ? 1 : -1;
    const skip = (query.page - 1) * query.pageSize;

    const { items, total } = await orderRepository.list({
      filter,
      sortField: query.sort,
      sortDir,
      skip,
      limit: query.pageSize,
    });

    return {
      items: items.map((item) => ({
        id: item._id.toString(),
        customerName: item.customerName,
        customerEmail: item.customerEmail,
        status: item.status,
        totalCents: item.totalCents,
        createdAt: item.createdAt,
        createdBy: item.createdBy.toString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  },

  async create(
    user: AuthUser,
    idempotencyKey: string | undefined,
    input: CreateOrderInput,
  ) {
    if (!idempotencyKey || idempotencyKey.trim() === "") {
      throw new AppError(400, "Idempotency-Key header is required");
    }

    const computedTotal = computeTotalCents(input.items);
    if (computedTotal !== input.totalCents) {
      throw new AppError(
        400,
        `totalCents mismatch: expected ${computedTotal}, got ${input.totalCents}`,
      );
    }

    const requestHash = requestHashFor(input);

    try {
      const order = await orderRepository.create({
        customerName: input.customerName.trim(),
        customerNameLower: input.customerName.trim().toLowerCase(),
        customerEmail: input.customerEmail.trim().toLowerCase(),
        status: input.status,
        items: input.items,
        totalCents: computedTotal,
        createdAt: new Date(),
        createdBy: user.sub,
        idempotencyKey: idempotencyKey.trim(),
        requestHash,
      });

      return { order: toPublicOrder(order), created: true as const };
    } catch (err) {
      if (
        err instanceof mongoose.mongo.MongoServerError &&
        err.code === 11000
      ) {
        const existing = await orderRepository.findByIdempotency(
          user.sub,
          idempotencyKey.trim(),
        );
        if (!existing) {
          throw new AppError(409, "Duplicate create conflict");
        }
        if (existing.requestHash !== requestHash) {
          throw new AppError(
            422,
            "Idempotency-Key was reused with a different request body",
          );
        }
        return { order: toPublicOrder(existing), created: false as const };
      }
      throw err;
    }
  },

  async delete(id: string) {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError(400, "Invalid id");
    }
    const deleted = await orderRepository.deleteById(id);
    if (!deleted) {
      throw new AppError(404, "Order not found");
    }
  },
};
