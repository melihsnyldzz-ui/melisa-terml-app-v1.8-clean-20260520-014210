import { ImportJobKind, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function unique(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isInteger(value))));
}

function when<T>(condition: unknown, value: T): T[] {
  return condition ? [value] : [];
}

async function main() {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { stockCode: { startsWith: 'SMK-' } },
        { stockCode: { startsWith: 'IMP-' } },
        { stockCode: { startsWith: 'XLS-' } },
        { barcode: { startsWith: 'IMP-BAR-' } },
      ],
    },
    select: { id: true },
  });
  const productIds = products.map((item) => item.id);

  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { startsWith: 'Smoke ' } },
        { name: { startsWith: 'Import Musteri ' } },
        { name: { startsWith: 'XLSX Musteri ' } },
      ],
    },
    select: { id: true },
  });
  const customerIds = customers.map((item) => item.id);

  const suppliers = await prisma.supplier.findMany({
    where: {
      OR: [
        { name: { startsWith: 'Smoke ' } },
        { name: { startsWith: 'Import Tedarikci ' } },
        { name: { startsWith: 'XLSX Tedarikci ' } },
      ],
    },
    select: { id: true },
  });
  const supplierIds = suppliers.map((item) => item.id);

  const salesReceipts = await prisma.salesReceipt.findMany({
    where: {
      OR: [
        ...when(customerIds.length, { customerId: { in: customerIds } }),
        ...when(productIds.length, { items: { some: { productId: { in: productIds } } } }),
        { localUuid: { startsWith: 'smoke' } },
        { terminalId: 'SMOKE-TERM' },
        { note: { contains: 'Smoke' } },
      ],
    },
    select: { id: true, documentNo: true },
  });
  const salesReceiptIds = salesReceipts.map((item) => item.id);

  const purchaseReceipts = await prisma.purchaseReceipt.findMany({
    where: {
      OR: [
        ...when(supplierIds.length, { supplierId: { in: supplierIds } }),
        ...when(productIds.length, { items: { some: { productId: { in: productIds } } } }),
        { note: { contains: 'Smoke' } },
      ],
    },
    select: { id: true, documentNo: true },
  });
  const purchaseReceiptIds = purchaseReceipts.map((item) => item.id);
  const documentNos = [...salesReceipts, ...purchaseReceipts].map((item) => item.documentNo);

  const smokeUsers = await prisma.user.findMany({
    where: {
      OR: [
        { username: { startsWith: 'smoke_' } },
        { username: { startsWith: 'manager_deneme_' } },
        { username: { startsWith: 'staff_deneme_' } },
      ],
    },
    select: { id: true },
  });
  const userIds = smokeUsers.map((item) => item.id);

  const importJobs = await prisma.importJob.findMany({
    where: {
      OR: [
        ...when(productIds.length, { kind: { in: [ImportJobKind.PRODUCTS, ImportJobKind.PRICES, ImportJobKind.STOCK] }, rows: { some: { entityId: { in: productIds } } } }),
        ...when(customerIds.length, { kind: ImportJobKind.CUSTOMERS, rows: { some: { entityId: { in: customerIds } } } }),
        ...when(supplierIds.length, { kind: ImportJobKind.SUPPLIERS, rows: { some: { entityId: { in: supplierIds } } } }),
      ],
    },
    select: { id: true },
  });
  const importJobIds = unique(importJobs.map((item) => item.id));

  const currentAccountMovements = await prisma.currentAccountMovement.findMany({
    where: {
      OR: [
        ...when(customerIds.length, { customerId: { in: customerIds } }),
        ...when(supplierIds.length, { supplierId: { in: supplierIds } }),
        ...when(documentNos.length, { documentNo: { in: documentNos } }),
        { description: { contains: 'Smoke' } },
      ],
    },
    select: { id: true },
  });
  const currentAccountMovementIds = currentAccountMovements.map((item) => item.id);

  const deletion = await prisma.$transaction(async (tx) => {
    const auditLogs = await tx.auditLog.deleteMany({
      where: {
        OR: [
          ...when(userIds.length, { userId: { in: userIds } }),
          ...when(productIds.length, { entityType: 'product', entityId: { in: productIds } }),
          ...when(customerIds.length, { entityType: 'customer', entityId: { in: customerIds } }),
          ...when(supplierIds.length, { entityType: 'supplier', entityId: { in: supplierIds } }),
          ...when(salesReceiptIds.length, { entityType: 'sales_receipt', entityId: { in: salesReceiptIds } }),
          ...when(purchaseReceiptIds.length, { entityType: 'purchase_receipt', entityId: { in: purchaseReceiptIds } }),
          ...when(currentAccountMovementIds.length, { entityType: 'current_account_movement', entityId: { in: currentAccountMovementIds } }),
          ...when(importJobIds.length, { entityType: 'import', entityId: { in: importJobIds } }),
        ],
      },
    });

    const importJobsDeleted = importJobIds.length
      ? await tx.importJob.deleteMany({ where: { id: { in: importJobIds } } })
      : { count: 0 };
    const terminalSyncQueue = await tx.terminalSyncQueue.deleteMany({
      where: {
        OR: [
          { terminalId: 'SMOKE-TERM' },
          { localUuid: { startsWith: 'smoke' } },
          { localUuid: 'heartbeat:SMOKE-TERM' },
          { lastError: { contains: 'SMK-' } },
          { lastError: { contains: 'IMP-' } },
        ],
      },
    });
    const currentAccount = currentAccountMovementIds.length
      ? await tx.currentAccountMovement.deleteMany({ where: { id: { in: currentAccountMovementIds } } })
      : { count: 0 };
    const stockMovements = await tx.stockMovement.deleteMany({
      where: {
        OR: [
          ...when(productIds.length, { productId: { in: productIds } }),
          ...when(salesReceiptIds.length, { sourceDocumentType: 'sales_receipt', sourceDocumentId: { in: salesReceiptIds } }),
          ...when(purchaseReceiptIds.length, { sourceDocumentType: 'purchase_receipt', sourceDocumentId: { in: purchaseReceiptIds } }),
          { note: { contains: 'Smoke' } },
        ],
      },
    });
    const salesItems = await tx.salesReceiptItem.deleteMany({
      where: {
        OR: [
          ...when(salesReceiptIds.length, { salesReceiptId: { in: salesReceiptIds } }),
          ...when(productIds.length, { productId: { in: productIds } }),
        ],
      },
    });
    const purchaseItems = await tx.purchaseReceiptItem.deleteMany({
      where: {
        OR: [
          ...when(purchaseReceiptIds.length, { purchaseReceiptId: { in: purchaseReceiptIds } }),
          ...when(productIds.length, { productId: { in: productIds } }),
        ],
      },
    });
    const sales = salesReceiptIds.length ? await tx.salesReceipt.deleteMany({ where: { id: { in: salesReceiptIds } } }) : { count: 0 };
    const purchases = purchaseReceiptIds.length ? await tx.purchaseReceipt.deleteMany({ where: { id: { in: purchaseReceiptIds } } }) : { count: 0 };
    const productsDeleted = productIds.length ? await tx.product.deleteMany({ where: { id: { in: productIds } } }) : { count: 0 };
    const customersDeleted = customerIds.length ? await tx.customer.deleteMany({ where: { id: { in: customerIds } } }) : { count: 0 };
    const suppliersDeleted = supplierIds.length ? await tx.supplier.deleteMany({ where: { id: { in: supplierIds } } }) : { count: 0 };
    const usersDeleted = userIds.length ? await tx.user.deleteMany({ where: { id: { in: userIds } } }) : { count: 0 };

    return {
      auditLogs: auditLogs.count,
      importJobs: importJobsDeleted.count,
      terminalSyncQueue: terminalSyncQueue.count,
      currentAccountMovements: currentAccount.count,
      stockMovements: stockMovements.count,
      salesReceiptItems: salesItems.count,
      purchaseReceiptItems: purchaseItems.count,
      salesReceipts: sales.count,
      purchaseReceipts: purchases.count,
      products: productsDeleted.count,
      customers: customersDeleted.count,
      suppliers: suppliersDeleted.count,
      users: usersDeleted.count,
    };
  }, { timeout: 30000 });

  console.log(JSON.stringify(deletion, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
