import type { Request, Response } from "express";
import { orderService } from "../services/order.service.js";
import type {
  CreateOrderInput,
  ListOrdersQuery,
} from "../validation/order.schema.js";

export const orderController = {
  async list(req: Request, res: Response) {
    const result = await orderService.list(req.query as unknown as ListOrdersQuery);
    res.json(result);
  },

  async create(req: Request, res: Response) {
    const keyHeader = req.header("Idempotency-Key") ?? undefined;
    const result = await orderService.create(
      req.user!,
      keyHeader,
      req.body as CreateOrderInput,
    );
    res.status(result.created ? 201 : 200).json({
      order: result.order,
      replayed: !result.created,
    });
  },

  async remove(req: Request, res: Response) {
    await orderService.delete(req.params.id as string);
    res.status(204).send();
  },
};
