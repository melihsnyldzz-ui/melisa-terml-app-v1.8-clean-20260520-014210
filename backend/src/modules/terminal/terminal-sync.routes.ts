import { Router } from 'express';
import { asyncHandler } from '../../utils.js';
import { requireAuth, requirePermission } from '../auth/auth.js';
import { getTerminalSyncSummary, listTerminalSyncLogs, syncTerminalSalesReceipt } from './terminal.routes.js';

const router = Router();

router.post('/', asyncHandler(async (req, res) => {
  const result = await syncTerminalSalesReceipt(req.body);
  res.status(result.ok ? 200 : 400).json(result);
}));

router.get('/logs', requireAuth, requirePermission('terminalSyncView'), asyncHandler(async (_req, res) => {
  res.json({ ok: true, logs: await listTerminalSyncLogs() });
}));

router.get('/summary', requireAuth, requirePermission('terminalSyncView'), asyncHandler(async (_req, res) => {
  res.json(await getTerminalSyncSummary());
}));

export default router;
