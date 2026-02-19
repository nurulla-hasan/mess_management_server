import { Router } from 'express';
import { register, login, getMe, changePassword, updateProfile } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema, changePasswordSchema, updateProfileSchema } from '../validators/auth.validator';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, getMe);
router.put('/change-password', requireAuth, validate(changePasswordSchema), changePassword);
router.put('/profile', requireAuth, validate(updateProfileSchema), updateProfile);

export default router;
