import type { Prisma } from '@prisma/client';
import { prisma } from '../../prisma/client.js';

type AuditClient = Pick<Prisma.TransactionClient, 'auditLog'> | typeof prisma;

export async function writeAuditLog(
  client: AuditClient,
  input: {
    action: string;
    entityType: string;
    entityId: number;
    detailsJson?: Prisma.InputJsonValue;
    userId?: number | null;
  },
) {
  await client.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.userId ?? null,
      detailsJson: input.detailsJson ?? undefined,
    },
  });
}
