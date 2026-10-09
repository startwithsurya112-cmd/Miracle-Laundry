import { Router } from 'express';
import { getSettings, updateSettings, resetData } from '../controllers/settingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public route to fetch basic shop settings for invoice / login header if needed
router.get('/public', getSettings);

router.use(authMiddleware);
router.get('/', getSettings);
router.put('/', updateSettings);
router.delete('/reset', resetData);

export default router;
