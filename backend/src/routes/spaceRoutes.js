import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createSpace,
  getSpaces,
  getSpace,
  updateSpace,
  deleteSpace,
  addSpaceMember,
  removeSpaceMember,
  reorderSpaces,
  archiveSpace,
  restoreSpace
} from '../controllers/spaceController.js';

const router = express.Router();

router.use(protect);

router.get('/workspace/:workspaceId', getSpaces);
router.post('/workspace/:workspaceId', createSpace);
router.put('/workspace/:workspaceId/reorder', reorderSpaces);

router.route('/:id')
  .get(getSpace)
  .put(updateSpace)
  .delete(deleteSpace);

router.post('/:id/members', addSpaceMember);
router.delete('/:id/members/:userId', removeSpaceMember);
router.post('/:id/archive', archiveSpace);
router.post('/:id/restore', restoreSpace);

export default router;
