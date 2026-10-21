import { z } from "zod";
import { ORDER_STATUSES } from "../models/order.model.js";

const createOrderItemSchema = z.object({
  productName: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(10_000),
});

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(1).max(200),
  customerEmail: z.string().trim().email().max(320),
  items: z.array(createOrderItemSchema).min(1).max(5),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const listOrdersQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(""),
  status: z.enum(ORDER_STATUSES).optional(),
  sort: z.enum(["createdAt", "totalCents"]).optional().default("createdAt"),
  dir: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
