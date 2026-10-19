import type { SortOrder, Types } from "mongoose";
import {
  OrderModel,
  type OrderDocument,
  type OrderStatus,
} from "../models/order.model.js";

type OrderFilter = Record<string, unknown>;

export type OrderListItem = {
  _id: Types.ObjectId;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: Date;
  createdBy: Types.ObjectId;
};

export type ListOrdersParams = {
  filter: OrderFilter;
  sortField: "createdAt" | "totalCents";
  sortDir: 1 | -1;
  skip: number;
  limit: number;
};

export type CreateOrderRecord = {
  customerName: string;
  customerNameLower: string;
  customerEmail: string;
  status: OrderStatus;
  items: Array<{
    productName: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  totalCents: number;
  createdAt: Date;
  createdBy: Types.ObjectId | string;
  idempotencyKey: string;
  requestHash: string;
};

export const orderRepository = {
  async list(params: ListOrdersParams): Promise<{
    items: OrderListItem[];
    total: number;
  }> {
    const sort: Record<string, SortOrder> = {
      [params.sortField]: params.sortDir,
      _id: params.sortDir,
    };

    const [items, total] = await Promise.all([
      OrderModel.find(params.filter)
        .sort(sort)
        .skip(params.skip)
        .limit(params.limit)
        .select(
          "customerName customerEmail status totalCents createdAt createdBy",
        )
        .lean<OrderListItem[]>()
        .exec(),
      OrderModel.countDocuments(params.filter).exec(),
    ]);

    return { items, total };
  },

  create(data: CreateOrderRecord): Promise<OrderDocument> {
    return OrderModel.create(data);
  },

  findByIdempotency(
    createdBy: string,
    idempotencyKey: string,
  ): Promise<OrderDocument | null> {
    return OrderModel.findOne({ createdBy, idempotencyKey }).exec();
  },

  findById(id: string): Promise<OrderDocument | null> {
    return OrderModel.findById(id).exec();
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await OrderModel.findByIdAndDelete(id).exec();
    return Boolean(result);
  },

  countByIdempotencyKey(idempotencyKey: string): Promise<number> {
    return OrderModel.countDocuments({ idempotencyKey }).exec();
  },

  async deleteAll(): Promise<void> {
    await OrderModel.deleteMany({});
  },

  async syncIndexes(): Promise<void> {
    await OrderModel.syncIndexes();
  },

  async insertMany(docs: Array<Partial<CreateOrderRecord> & {
    customerName: string;
    customerNameLower: string;
    customerEmail: string;
    status: OrderStatus;
    items: CreateOrderRecord["items"];
    totalCents: number;
    createdAt: Date;
    createdBy: Types.ObjectId | string;
  }>): Promise<void> {
    await OrderModel.insertMany(docs, { ordered: false });
  },
};
