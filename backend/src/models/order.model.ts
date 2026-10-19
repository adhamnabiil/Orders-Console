import { Schema, model, type InferSchemaType, type Types } from "mongoose";

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const orderItemSchema = new Schema(
  {
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceCents: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    customerName: { type: String, required: true, trim: true },
    customerNameLower: { type: String, required: true, index: true },
    customerEmail: { type: String, required: true, lowercase: true, trim: true },
    status: { type: String, enum: ORDER_STATUSES, required: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: unknown[]) => items.length >= 1 && items.length <= 5,
        message: "Order must have 1 to 5 line items",
      },
    },
    totalCents: { type: Number, required: true, min: 0 },
    createdAt: { type: Date, required: true, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    idempotencyKey: { type: String },
    requestHash: { type: String },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

orderSchema.index({ createdAt: -1, _id: -1 });
orderSchema.index({ totalCents: -1, _id: -1 });
orderSchema.index({ status: 1, createdAt: -1, _id: -1 });
orderSchema.index({ status: 1, totalCents: -1, _id: -1 });
orderSchema.index({ customerEmail: 1 });
orderSchema.index(
  { createdBy: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);

export type OrderDocument = InferSchemaType<typeof orderSchema> & {
  _id: Types.ObjectId;
};

export const OrderModel = model("Order", orderSchema);
