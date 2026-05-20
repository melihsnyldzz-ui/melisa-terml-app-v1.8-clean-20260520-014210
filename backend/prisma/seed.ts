import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const products = [
  {
    stockCode: 'MB-1001',
    barcode: '8690000001001',
    brand: 'Melisa Bebe',
    typeName: 'Bebek Takim',
    quantity: 24,
    buyPrice: 120,
    sellPrice: 199,
    buyPriceTry: 120,
    buyPriceUsd: 4,
    buyPriceEur: 3.6,
    sellPriceTry: 199,
    sellPriceUsd: 6.7,
    sellPriceEur: 6.1,
  },
  {
    stockCode: 'MB-1002',
    barcode: '8690000001002',
    brand: 'Melisa Bebe',
    typeName: 'Hastane Cikisi',
    quantity: 18,
    buyPrice: 180,
    sellPrice: 289,
    buyPriceTry: 180,
    buyPriceUsd: 6,
    buyPriceEur: 5.5,
    sellPriceTry: 289,
    sellPriceUsd: 9.7,
    sellPriceEur: 8.8,
  },
  {
    stockCode: 'MB-1003',
    barcode: '8690000001003',
    brand: 'MiniJoy',
    typeName: 'Tulum',
    quantity: 32,
    buyPrice: 95,
    sellPrice: 159,
    buyPriceTry: 95,
    buyPriceUsd: 3.2,
    buyPriceEur: 2.9,
    sellPriceTry: 159,
    sellPriceUsd: 5.3,
    sellPriceEur: 4.8,
  },
  {
    stockCode: 'MB-1004',
    barcode: '8690000001004',
    brand: 'BabySoft',
    typeName: 'Zibin Seti',
    quantity: 40,
    buyPrice: 62,
    sellPrice: 109,
    buyPriceTry: 62,
    buyPriceUsd: 2.1,
    buyPriceEur: 1.9,
    sellPriceTry: 109,
    sellPriceUsd: 3.7,
    sellPriceEur: 3.3,
  },
  {
    stockCode: 'MB-1005',
    barcode: '8690000001005',
    brand: 'Melisa Kids',
    typeName: 'Cocuk Elbise',
    quantity: 15,
    buyPrice: 150,
    sellPrice: 249,
    buyPriceTry: 150,
    buyPriceUsd: 5,
    buyPriceEur: 4.5,
    sellPriceTry: 249,
    sellPriceUsd: 8.4,
    sellPriceEur: 7.5,
  },
];

const customers = [
  { name: 'ABC Baby Store', phone: '02120000001', defaultCurrency: 'TRY' as const },
  { name: 'Mini Kids', phone: '02120000002', defaultCurrency: 'USD' as const },
  { name: 'Nova Baby', phone: '03120000003', defaultCurrency: 'EUR' as const },
];

const suppliers = [
  { name: 'Melisa Merkez Depo', phone: '02120000010', defaultCurrency: 'TRY' as const },
  { name: 'Istanbul Tedarik', phone: '02120000011', defaultCurrency: 'USD' as const },
  { name: 'Bursa Tekstil', phone: '02240000012', defaultCurrency: 'EUR' as const },
];

async function main() {
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH ?? await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'admin123', 10);
  const staffPasswordHash = process.env.STAFF_PASSWORD_HASH ?? await bcrypt.hash(process.env.STAFF_PASSWORD ?? 'staff123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      name: 'Sistem Yoneticisi',
      role: 'ADMIN',
      active: true,
      passwordHash: adminPasswordHash,
    },
    create: {
      name: 'Sistem Yoneticisi',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      active: true,
    },
  });
  await prisma.user.upsert({
    where: { username: 'staff' },
    update: {
      name: 'Satis Personeli',
      role: 'SALES',
      active: true,
      passwordHash: staffPasswordHash,
    },
    create: {
      name: 'Satis Personeli',
      username: 'staff',
      passwordHash: staffPasswordHash,
      role: 'SALES',
      active: true,
    },
  });

  const activeRate = await prisma.exchangeRate.findFirst({ where: { active: true } });
  if (!activeRate) {
    await prisma.exchangeRate.create({
      data: {
        usdToTry: 30,
        eurToTry: 33,
        tryToUsd: 1 / 30,
        tryToEur: 1 / 33,
        eurToUsd: 1.1,
        usdToEur: 30 / 33,
        baseCurrency: 'TRY',
        targetCurrency: 'USD',
        rate: 1 / 30,
        effectiveDate: new Date(),
        active: true,
      },
    });
  }
  for (const product of products) {
    await prisma.product.upsert({
      where: { stockCode: product.stockCode },
      update: product,
      create: product,
    });
  }

  for (const customer of customers) {
    const existing = await prisma.customer.findFirst({ where: { name: customer.name } });
    if (existing) {
      await prisma.customer.update({ where: { id: existing.id }, data: { ...customer, active: true } });
    } else {
      await prisma.customer.create({ data: customer });
    }
  }

  for (const supplier of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { name: supplier.name } });
    if (existing) {
      await prisma.supplier.update({ where: { id: existing.id }, data: { ...supplier, active: true } });
    } else {
      await prisma.supplier.create({ data: supplier });
    }
  }
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : 'Bilinmeyen seed hatasi.';
    if (message.includes("Can't reach database server")) {
      console.error('Seed basarisiz: PostgreSQL sunucusuna ulasilamiyor. DATABASE_URL, PostgreSQL servisi ve 5432 portunu kontrol edin.');
    } else {
      console.error(`Seed basarisiz: ${message}`);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
