import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  addAssignee,
  removeAssignee,
  addComment,
  getComments,
  addChecklist,
  updateChecklistItem,
  addAttachment,
  startTimeTracking,
  stopTimeTracking,
  addDependency,
  moveTask,
  watchTask,
  unwatchTask,
  getMyTasks,
  reorderTasks
} from '../controllers/taskController.js';

const router = express.Router();

router.use(protect);

router.get('/my-tasks', getMyTasks);

router.route('/')
  .get(getTasks)
  .post(createTask);

router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

router.post('/:id/assignees', addAssignee);
router.delete('/:id/assignees/:userId', removeAssignee);

router.route('/:id/comments')
  .get(getComments)
  .post(addComment);

router.post('/:id/checklists', addChecklist);
router.put('/:id/checklists/:checklistId/items/:itemId', updateChecklistItem);

router.post('/:id/attachments', addAttachment);

router.post('/:id/time-tracking/start', startTimeTracking);
router.post('/:id/time-tracking/stop', stopTimeTracking);

router.post('/:id/dependencies', addDependency);
router.put('/:id/move', moveTask);

router.post('/:id/watch', watchTask);
router.delete('/:id/watch', unwatchTask);

router.put('/list/:listId/reorder', reorderTasks);

export default router;
