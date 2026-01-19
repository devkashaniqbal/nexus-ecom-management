import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createFolder,
  getFolders,
  getFolder,
  updateFolder,
  deleteFolder,
  reorderFolders,
  archiveFolder,
  restoreFolder
} from '../controllers/folderController.js';

const router = express.Router();

router.use(protect);

router.post('/', createFolder);
router.get('/space/:spaceId', getFolders);
router.put('/reorder', reorderFolders);

router.route('/:id')
  .get(getFolder)
  .put(updateFolder)
  .delete(deleteFolder);

router.post('/:id/archive', archiveFolder);
router.post('/:id/restore', restoreFolder);

export default router;
