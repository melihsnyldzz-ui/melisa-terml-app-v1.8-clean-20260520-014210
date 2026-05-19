import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function createDocumentNo(prefix: string) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${datePart}-${timePart}-${randomPart}`;
}

export function toNumber(value: unknown) {
  return Number(value ?? 0);
}
