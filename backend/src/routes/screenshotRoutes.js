import express from 'express';
import {
  uploadScreenshotImage,
  getMyScreenshots,
  getUserScreenshots,
  getScreenshotUrl,
  checkScreenshotStatus
} from '../controllers/screenshotController.js';
import { protect, isManagerOrAbove } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/upload', uploadScreenshotImage);
router.get('/status', checkScreenshotStatus);
router.get('/my', getMyScreenshots);
router.get('/user/:userId', isManagerOrAbove, getUserScreenshots);
router.get('/:screenshotId/url', getScreenshotUrl);

export default router;
