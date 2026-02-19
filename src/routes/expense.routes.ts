import { Router } from 'express';
import {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  getExpenseStats,
} from '../controllers/expense.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createExpenseSchema, updateExpenseSchema } from '../validators/expense.validator';
import { uploadSingle } from '../middleware/upload.middleware';

const router = Router();

router.use(requireAuth);

router.get('/stats', getExpenseStats);
router.get('/', getExpenses);
router.post('/', requireAdmin, uploadSingle('receipt'), validate(createExpenseSchema), createExpense);
router.put('/:id', requireAdmin, uploadSingle('receipt'), validate(updateExpenseSchema), updateExpense);
router.delete('/:id', requireAdmin, deleteExpense);

export default router;
