import express from 'express';
import {
  createDeposit,
  getAllDeposits,
  getMyDeposits,
  updateDepositStatus,
  deleteDeposit,
  getDepositSummary,
} from '../controllers/deposit.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createDepositSchema, updateDepositStatusSchema } from '../validators/deposit.validator';

const router = express.Router();

// Public/Member routes
router.get('/summary', requireAuth, getDepositSummary);
router.post('/', requireAuth, validate(createDepositSchema), createDeposit);
router.get('/my-deposits', requireAuth, getMyDeposits);


// Admin routes
router.get('/', requireAuth, requireAdmin, getAllDeposits);
router.put('/:id/status', requireAuth, requireAdmin, validate(updateDepositStatusSchema), updateDepositStatus);
router.delete('/:id', requireAuth, requireAdmin, deleteDeposit);

export default router;
