import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createChannel,
  getChannels,
  getChannel,
  updateChannel,
  deleteChannel,
  joinChannel,
  leaveChannel,
  addChannelMember,
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  getOrCreateDirect,
  markAsRead
} from '../controllers/channelController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getChannels)
  .post(createChannel);

router.post('/direct', getOrCreateDirect);

router.route('/:id')
  .get(getChannel)
  .put(updateChannel)
  .delete(deleteChannel);

router.post('/:id/join', joinChannel);
router.post('/:id/leave', leaveChannel);
router.post('/:id/members', addChannelMember);
router.post('/:id/mark-read', markAsRead);

router.route('/:id/messages')
  .get(getMessages)
  .post(sendMessage);

router.route('/:id/messages/:messageId')
  .put(editMessage)
  .delete(deleteMessage);

router.post('/:id/messages/:messageId/reactions', addReaction);
router.delete('/:id/messages/:messageId/reactions', removeReaction);

export default router;
