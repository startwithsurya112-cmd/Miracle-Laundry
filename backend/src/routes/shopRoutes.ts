import { Router } from 'express';
import {
  getShops,
  getShopById,
  createShop,
  updateShop,
  deleteShop,
  getShopOverview,
} from '../controllers/shopController';
import { authMiddleware, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// Public / Authenticated shop listing (used for branch switcher & POS context)
router.get('/', authMiddleware, getShops);
router.get('/overview', authMiddleware, requireSuperAdmin, getShopOverview);
router.get('/:id', authMiddleware, getShopById);

// Super Admin Only endpoints
router.post('/', authMiddleware, requireSuperAdmin, createShop);
router.put('/:id', authMiddleware, requireSuperAdmin, updateShop);
router.delete('/:id', authMiddleware, requireSuperAdmin, deleteShop);

export default router;
