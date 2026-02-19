import express from 'express';
import {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getMemberStats,
  getMyDashboard,
  toggleMealOff
} from '../controllers/member.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createMemberSchema, updateMemberSchema, toggleMealOffSchema } from '../validators/member.validator';

const router = express.Router();

// Protect all routes
router.use(requireAuth);

// Dashboard & Stats
router.get('/stats', requireAdmin, getMemberStats);
router.get('/me/dashboard', getMyDashboard);

// Member actions
router.put('/me/meal-off', validate(toggleMealOffSchema), toggleMealOff);

// CRUD
router.route('/')
    .get(getAllMembers)
    .post(requireAdmin, validate(createMemberSchema), createMember);

router.route('/:id')
    .get(getMemberById)
    .put(requireAdmin, validate(updateMemberSchema), updateMember)
    .delete(requireAdmin, deleteMember);

export default router;
