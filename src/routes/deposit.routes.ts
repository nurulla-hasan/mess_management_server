import { Router } from 'express';
import {
  createDeposit,
  getDeposits,
  getMyDeposits,
  verifyDeposit,
  requestVerification,
} from '../controllers/deposit.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createDepositSchema } from '../validators/expense.validator';

const router = Router();

router.use(requireAuth);

router.get('/me', getMyDeposits);
router.post('/', validate(createDepositSchema), createDeposit);
router.get('/', getDeposits);
router.put('/:id/verify', requireAdmin, verifyDeposit);
router.put('/:id/request-verification', requestVerification);

export default router;
