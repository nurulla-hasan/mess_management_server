import { Router } from 'express';
import {
  getMealRateTrend,
  getExpenseDistribution,
  getSettlement,
  getDashboardOverview,
} from '../controllers/report.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', getDashboardOverview);
router.get('/meal-rate-trend', getMealRateTrend);
router.get('/expense-distribution', getExpenseDistribution);
router.get('/settlement', getSettlement);

export default router;
