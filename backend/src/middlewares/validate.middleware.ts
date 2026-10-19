import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type Target = "body" | "query" | "params";

declare module "express-serve-static-core" {
  interface Request {
    validatedQuery?: unknown;
    validatedParams?: unknown;
  }
}

export function validate(schema: ZodType, target: Target = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[target]);

    if (target === "body") {
      req.body = parsed;
    } else if (target === "query") {
      // Express 5 exposes req.query as a getter — do not reassign it.
      req.validatedQuery = parsed;
    } else {
      req.validatedParams = parsed;
    }

    next();
  };
}
