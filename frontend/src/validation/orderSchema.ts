import { z } from "zod";

const orderItemSchema = z.object({
  productName: z.string().trim().min(1, "Product name is required"),
  quantity: z.coerce.number().int().min(1).max(10_000),
  unitPriceCents: z.coerce.number().int().min(0).max(100_000_000),
});

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required"),
  customerEmail: z.string().trim().email("Valid email is required"),
  items: z.array(orderItemSchema).min(1).max(5),
});

export type CreateOrderFormValues = z.infer<typeof createOrderSchema>;

export function computeTotalCents(
  items: CreateOrderFormValues["items"],
): number {
  return items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPriceCents),
    0,
  );
}
