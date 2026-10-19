import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type Target = "body" | "query" | "params";

export function validate(schema: ZodType, target: Target = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[target]);
    (req as Request & Record<Target, unknown>)[target] = parsed;
    next();
  };
}
