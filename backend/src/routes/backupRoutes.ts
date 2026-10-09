import { Router } from 'express';
import { exportMasterExcelBackup, restoreMasterExcelBackup, importOldAppOrdersJson } from '../controllers/backupController';

const router = Router();

router.get('/export', exportMasterExcelBackup);
router.post('/restore', restoreMasterExcelBackup);
router.post('/import-json', importOldAppOrdersJson);

export default router;
