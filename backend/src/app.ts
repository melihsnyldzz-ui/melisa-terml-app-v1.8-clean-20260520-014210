import cors from 'cors';
import express from 'express';
import { getDatabaseUrl } from './config.js';
import authRoutes from './modules/auth/auth.routes.js';
import { requireAuth } from './modules/auth/auth.js';
import customersRoutes from './modules/customers/customers.routes.js';
import currentAccountRoutes from './modules/current-account/current-account.routes.js';
import exchangeRatesRoutes from './modules/currency/exchange-rates.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import importRoutes from './modules/import/import.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import purchaseReceiptsRoutes from './modules/receipts/purchase-receipts.routes.js';
import salesReceiptsRoutes from './modules/receipts/sales-receipts.routes.js';
import stockMovementsRoutes from './modules/stock-movements/stock-movements.routes.js';
import suppliersRoutes from './modules/suppliers/suppliers.routes.js';
import systemRoutes from './modules/system/system.routes.js';
import terminalDevicesRoutes from './modules/terminal/terminal-devices.routes.js';
import terminalSyncRoutes from './modules/terminal/terminal-sync.routes.js';
import terminalRoutes from './modules/terminal/terminal.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import { prisma } from './prisma/client.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', async (_req, res) => {
  let databaseConnected = false;
  if (getDatabaseUrl()) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch {
      databaseConnected = false;
    }
  }

  res.json({
    status: databaseConnected ? 'OK' : 'DEGRADED',
    databaseConnected,
    timestamp: new Date().toISOString(),
    appVersion: process.env.npm_package_version ?? '0.1.0',
    environment: process.env.NODE_ENV ?? 'development',
  });
});

app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/reports', requireAuth, reportsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes);
app.use('/api/import', requireAuth, importRoutes);
app.use('/api/products', requireAuth, productsRoutes);
app.use('/api/customers', requireAuth, customersRoutes);
app.use('/api/current-account', requireAuth, currentAccountRoutes);
app.use('/api/suppliers', requireAuth, suppliersRoutes);
app.use('/api/purchase-receipts', requireAuth, purchaseReceiptsRoutes);
app.use('/api/sales-receipts', requireAuth, salesReceiptsRoutes);
app.use('/api/sales', requireAuth, salesReceiptsRoutes);
app.use('/api/stock-movements', requireAuth, stockMovementsRoutes);
app.use('/api/system', requireAuth, systemRoutes);
app.use('/api/terminal', terminalRoutes);
app.use('/api/terminal-sync', terminalSyncRoutes);
app.use('/api/terminal-devices', terminalDevicesRoutes);
app.use('/api/users', requireAuth, usersRoutes);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const rawMessage = error instanceof Error ? error.message : 'Unexpected error';
  const message = rawMessage.includes("Can't reach database server")
    ? 'PostgreSQL baglantisi yok. DATABASE_URL, PostgreSQL servisi ve port erisimini kontrol edin.'
    : rawMessage;
  res.status(400).json({ ok: false, message });
});
