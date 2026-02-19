import { Router } from 'express';
import {
  createMeal,
  getMeals,
  getMealByDate,
  updateMeal,
  getMealSummary,
} from '../controllers/meal.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createMealSchema, updateMealSchema } from '../validators/meal.validator';

const router = Router();

router.use(requireAuth);

// Summary route (before dynamic routes)
router.get('/summary', getMealSummary);

router.get('/', getMeals);
router.get('/:date', getMealByDate);
router.post('/', requireAdmin, validate(createMealSchema), createMeal);
router.put('/:id', requireAdmin, validate(updateMealSchema), updateMeal);

export default router;
