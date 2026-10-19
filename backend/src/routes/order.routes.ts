import { Router } from "express";
import { orderController } from "../controllers/order.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { latencyMiddleware } from "../middlewares/latency.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createOrderSchema,
  listOrdersQuerySchema,
} from "../validation/order.schema.js";

export const orderRoutes = Router();

orderRoutes.use(requireAuth);
orderRoutes.use(latencyMiddleware);

orderRoutes.get(
  "/",
  validate(listOrdersQuerySchema, "query"),
  (req, res, next) => {
    orderController.list(req, res).catch(next);
  },
);

orderRoutes.post(
  "/",
  validate(createOrderSchema, "body"),
  (req, res, next) => {
    orderController.create(req, res).catch(next);
  },
);

orderRoutes.delete(
  "/:id",
  requireRole("admin"),
  (req, res, next) => {
    orderController.remove(req, res).catch(next);
  },
);
