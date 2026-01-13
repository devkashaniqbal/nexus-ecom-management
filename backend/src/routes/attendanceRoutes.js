import express from 'express';
import {
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceSummary,
  getAllTodayAttendance
} from '../controllers/attendanceController.js';
import { protect, isManagerOrAbove } from '../middleware/auth.js';
import { checkIpRestriction } from '../middleware/ipRestriction.js';

const router = express.Router();

router.use(protect);

router.post('/check-in', checkIpRestriction, checkIn);
router.post('/check-out', checkOut);
router.post('/break/start', startBreak);
router.post('/break/end', endBreak);
router.get('/today', getTodayAttendance);
router.get('/history/:userId?', getAttendanceHistory);
router.get('/summary/:userId?', getAttendanceSummary);
router.get('/all/today', isManagerOrAbove, getAllTodayAttendance);

export default router;
