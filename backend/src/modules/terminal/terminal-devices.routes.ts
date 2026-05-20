import { Router } from 'express';
import { asyncHandler } from '../../utils.js';
import { saveTerminalHeartbeat } from './terminal.routes.js';

const router = Router();

router.post('/heartbeat', asyncHandler(async (req, res) => {
  res.json(await saveTerminalHeartbeat(req.body));
}));

export default router;
