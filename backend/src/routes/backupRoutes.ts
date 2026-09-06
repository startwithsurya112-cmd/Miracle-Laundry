import { Router } from 'express';
import { exportMasterExcelBackup, restoreMasterExcelBackup, importOldAppOrdersJson } from '../controllers/backupController';
import { authMiddleware, requireSuperAdmin } from '../middleware/auth';

const router = Router();

router.use(authMiddleware, requireSuperAdmin);

router.get('/export', exportMasterExcelBackup);
router.post('/restore', restoreMasterExcelBackup);
router.post('/import-json', importOldAppOrdersJson);

export default router;
