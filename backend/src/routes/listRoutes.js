import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createList,
  getLists,
  getList,
  updateList,
  deleteList,
  moveList,
  reorderLists,
  addListStatus,
  updateListStatus,
  deleteListStatus,
  addCustomField
} from '../controllers/listController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getLists)
  .post(createList);

router.put('/reorder', reorderLists);

router.route('/:id')
  .get(getList)
  .put(updateList)
  .delete(deleteList);

router.put('/:id/move', moveList);
router.post('/:id/statuses', addListStatus);
router.put('/:id/statuses/:statusId', updateListStatus);
router.delete('/:id/statuses/:statusId', deleteListStatus);
router.post('/:id/custom-fields', addCustomField);

export default router;
