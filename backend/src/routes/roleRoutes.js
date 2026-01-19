import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  changeRole,
  changeManager,
  changeDepartment,
  changeDesignation,
  promoteUser,
  getUserRoleHistory,
  getMyRoleHistory,
  getPendingHandovers,
  completeHandover,
  updateHandoverTask,
  getAllRoleChanges
} from '../controllers/roleController.js';

const router = express.Router();

router.use(protect);

router.get('/my-history', getMyRoleHistory);
router.get('/handovers/pending', getPendingHandovers);
router.post('/handovers/:roleHistoryId/complete', completeHandover);
router.put('/handovers/:roleHistoryId/tasks/:taskIndex', updateHandoverTask);

router.get('/changes', authorize('admin'), getAllRoleChanges);

router.put('/users/:userId/role', authorize('admin'), changeRole);
router.put('/users/:userId/manager', authorize('admin', 'manager'), changeManager);
router.put('/users/:userId/department', authorize('admin'), changeDepartment);
router.put('/users/:userId/designation', authorize('admin', 'manager'), changeDesignation);
router.post('/users/:userId/promote', authorize('admin'), promoteUser);
router.get('/users/:userId/history', getUserRoleHistory);

export default router;
