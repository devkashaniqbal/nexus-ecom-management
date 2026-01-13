import express from 'express';
import {
  getAllAuditLogs,
  getUserAuditLogs,
  getAuditStats,
  exportAuditLogs,
} from '../controllers/auditController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Admin and Manager can view all logs
router.get('/', restrictTo('admin', 'manager'), getAllAuditLogs);
router.get('/stats', restrictTo('admin', 'manager'), getAuditStats);
router.get('/export', restrictTo('admin'), exportAuditLogs);

// Users can view their own logs, admins/managers can view anyone's
router.get('/user/:userId', getUserAuditLogs);

export default router;
