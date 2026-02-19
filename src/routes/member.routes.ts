import { Router } from 'express';
import {
  getMembers,
  getMember,
  addMember,
  updateMember,
  deleteMember,
  getMemberStats,
  getMyDashboard,
  toggleMealOff,
} from '../controllers/member.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { addMemberSchema, updateMemberSchema, mealOffSchema } from '../validators/member.validator';

const router = Router();

// All routes require auth
router.use(requireAuth);

// Member personal routes
router.get('/me/dashboard', getMyDashboard);
router.put('/me/meal-off', validate(mealOffSchema), toggleMealOff);

// Stats route (before :id to avoid conflict)
router.get('/stats', getMemberStats);

// Admin CRUD routes
router.get('/', getMembers);
router.get('/:id', getMember);
router.post('/', requireAdmin, validate(addMemberSchema), addMember);
router.put('/:id', requireAdmin, validate(updateMemberSchema), updateMember);
router.delete('/:id', requireAdmin, deleteMember);

export default router;
