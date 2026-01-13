import express from 'express';
import {
  chat,
  getChatHistory,
  getAllSessions,
  deleteSession,
  addKnowledge,
  getKnowledge,
  updateKnowledge,
  deleteKnowledge,
  bulkImportKnowledge,
  getAIAnalytics,
  exportChatHistory,
} from '../controllers/aiAgentController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Chat endpoints
router.post('/chat', chat);
router.get('/chat/sessions', getAllSessions);
router.get('/chat/sessions/:sessionId', getChatHistory);
router.get('/chat/sessions/:sessionId/export', exportChatHistory);
router.delete('/chat/sessions/:sessionId', deleteSession);

// Knowledge base endpoints - Admin only
router.post('/knowledge', restrictTo('admin'), addKnowledge);
router.post('/knowledge/bulk-import', restrictTo('admin'), bulkImportKnowledge);
router.get('/knowledge', getKnowledge);
router.patch('/knowledge/:id', restrictTo('admin'), updateKnowledge);
router.delete('/knowledge/:id', restrictTo('admin'), deleteKnowledge);

// Analytics - Admin only
router.get('/analytics', restrictTo('admin'), getAIAnalytics);

export default router;
