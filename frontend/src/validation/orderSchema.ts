import { z } from "zod";
import { CATALOG_PRODUCT_NAMES } from "../data/catalog";

const catalogNameSchema = z.enum(
  CATALOG_PRODUCT_NAMES as [string, ...string[]],
);

const orderItemSchema = z.object({
  productName: catalogNameSchema,
  quantity: z.coerce.number().int().min(1).max(10_000),
});

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required"),
  customerEmail: z.string().trim().email("Valid email is required"),
  items: z.array(orderItemSchema).min(1).max(5),
});

export type CreateOrderFormValues = z.infer<typeof createOrderSchema>;
