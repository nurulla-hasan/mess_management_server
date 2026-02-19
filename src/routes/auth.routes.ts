import { Router } from 'express';
import { register, login, refreshToken, verifyEmail, resendVerificationCode, getMe, changePassword, updateProfile, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema, changePasswordSchema, updateProfileSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validator';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);    
router.post('/resend-code', resendVerificationCode);
router.post('/login', validate(loginSchema), login);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/refresh-token', refreshToken);
router.get('/me', requireAuth, getMe);
router.put('/change-password', requireAuth, validate(changePasswordSchema), changePassword);
router.put('/profile', requireAuth, validate(updateProfileSchema), updateProfile);

export default router;
