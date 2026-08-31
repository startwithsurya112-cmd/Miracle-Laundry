import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/userController';
import { authMiddleware, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// All user management routes require Super Admin authentication
router.use(authMiddleware, requireSuperAdmin);

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
