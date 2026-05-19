import { z } from 'zod';

export const receiptItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative().optional(),
});

export const currencySchema = z.enum(['TRY', 'USD', 'EUR']);

const exchangeRateSnapshotSchema = z.object({
  usdToTry: z.number().positive(),
  eurToTry: z.number().positive(),
  tryToUsd: z.number().positive().optional().nullable(),
  tryToEur: z.number().positive().optional().nullable(),
  eurToUsd: z.number().positive().optional().nullable(),
  usdToEur: z.number().positive().optional().nullable(),
});

export const purchaseReceiptSchema = z.object({
  supplierId: z.number().int().positive(),
  currency: currencySchema.optional(),
  documentNo: z.string().min(1).optional(),
  note: z.string().optional().nullable(),
  items: z.array(receiptItemSchema).min(1),
});

export const salesReceiptSchema = z.object({
  customerId: z.number().int().positive(),
  currency: currencySchema.optional(),
  documentNo: z.string().min(1).optional(),
  terminalId: z.string().optional().nullable(),
  localUuid: z.string().optional().nullable(),
  synced: z.boolean().default(false),
  usedExchangeRate: exchangeRateSnapshotSchema.optional().nullable(),
  exchangeRateSnapshot: exchangeRateSnapshotSchema.optional().nullable(),
  note: z.string().optional().nullable(),
  items: z.array(receiptItemSchema).min(1),
});
