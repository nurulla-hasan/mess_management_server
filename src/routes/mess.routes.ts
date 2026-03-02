import { Router } from 'express';
import { createMess, getMyMess, joinMess, updateMess } from '../controllers/mess.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/', createMess);
router.get('/me', getMyMess);
router.put('/me', updateMess);
router.post('/join', joinMess);

export default router;
