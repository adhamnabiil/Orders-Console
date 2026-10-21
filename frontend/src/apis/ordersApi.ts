import { axiosInstance } from "./axiosInstance";

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
};

export const ordersApi = {
  list: (params: ListOrdersParams, signal?: AbortSignal) =>
    axiosInstance.get<ListOrdersResponse>("/orders", {
      params: {
        q: params.q || undefined,
        status: params.status || undefined,
        sort: params.sort,
        dir: params.dir,
        page: params.page,
        pageSize: params.pageSize,
      },
      signal,
    }),

  create: (input: CreateOrderInput, idempotencyKey: string) =>
    axiosInstance.post<{ order: OrderListItem; replayed: boolean }>(
      "/orders",
      input,
      { headers: { "Idempotency-Key": idempotencyKey } },
    ),

  delete: (id: string) => axiosInstance.delete(`/orders/${id}`),
};
