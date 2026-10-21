import { http } from "./http";

export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderListItem = {
  id: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
  createdBy: string;
};

export type ListOrdersParams = {
  q?: string;
  status?: OrderStatus | "";
  sort?: "createdAt" | "totalCents";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type ListOrdersResponse = {
  items: OrderListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateOrderItem = {
  productName: string;
  quantity: number;
};

export type CreateOrderInput = {
  customerName: string;
  customerEmail: string;
  items: CreateOrderItem[];
  status?: OrderStatus;
};

export async function listOrders(
  params: ListOrdersParams,
  signal?: AbortSignal,
): Promise<ListOrdersResponse> {
  const { data } = await http.get<ListOrdersResponse>("/orders", {
    params: {
      q: params.q || undefined,
      status: params.status || undefined,
      sort: params.sort,
      dir: params.dir,
      page: params.page,
      pageSize: params.pageSize,
    },
    signal,
  });
  return data;
}

export async function createOrder(
  input: CreateOrderInput,
  idempotencyKey: string,
): Promise<{ order: OrderListItem; replayed: boolean }> {
  const { data } = await http.post("/orders", input, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return data;
}

export async function deleteOrder(id: string): Promise<void> {
  await http.delete(`/orders/${id}`);
}
