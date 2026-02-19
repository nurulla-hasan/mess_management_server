import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  updateSettingsProfile,
} from '../controllers/settings.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { uploadSingle } from '../middleware/upload.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', getSettings);
router.put('/', requireAdmin, updateSettings);
router.put('/profile', uploadSingle('profilePicture'), updateSettingsProfile);

export default router;
