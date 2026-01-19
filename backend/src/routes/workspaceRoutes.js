import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  removeMember,
  updateMemberRole,
  createInviteLink,
  joinByInviteLink,
  getWorkspaceActivity
} from '../controllers/workspaceController.js';
import {
  createSpace,
  getSpaces,
  getSpace,
  updateSpace,
  deleteSpace,
  addSpaceMember,
  removeSpaceMember,
  archiveSpace,
  restoreSpace
} from '../controllers/spaceController.js';
import {
  createFolder,
  getFolders,
  getFolder,
  updateFolder,
  deleteFolder,
  archiveFolder,
  restoreFolder
} from '../controllers/folderController.js';
import {
  createList,
  getLists,
  getList,
  updateList,
  deleteList,
  addListStatus,
  updateListStatus,
  deleteListStatus,
  addCustomField
} from '../controllers/listController.js';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask
} from '../controllers/taskController.js';

const router = express.Router();

router.use(protect);

// Workspace routes
router.route('/')
  .get(getWorkspaces)
  .post(createWorkspace);

router.route('/:id')
  .get(getWorkspace)
  .put(updateWorkspace)
  .delete(deleteWorkspace);

router.post('/:id/invite', inviteMember);
router.delete('/:id/members/:userId', removeMember);
router.put('/:id/members/:userId/role', updateMemberRole);
router.post('/:id/invite-link', createInviteLink);
router.post('/join/:code', joinByInviteLink);
router.get('/:id/activity', getWorkspaceActivity);

// Nested Space routes
router.route('/:workspaceId/spaces')
  .get(getSpaces)
  .post(createSpace);

router.route('/:workspaceId/spaces/:spaceId')
  .get(getSpace)
  .put(updateSpace)
  .delete(deleteSpace);

router.post('/:workspaceId/spaces/:spaceId/members', addSpaceMember);
router.delete('/:workspaceId/spaces/:spaceId/members/:userId', removeSpaceMember);
router.post('/:workspaceId/spaces/:spaceId/archive', archiveSpace);
router.post('/:workspaceId/spaces/:spaceId/restore', restoreSpace);

// Nested Folder routes
router.route('/:workspaceId/spaces/:spaceId/folders')
  .get(getFolders)
  .post(createFolder);

router.route('/:workspaceId/spaces/:spaceId/folders/:folderId')
  .get(getFolder)
  .put(updateFolder)
  .delete(deleteFolder);

router.post('/:workspaceId/spaces/:spaceId/folders/:folderId/archive', archiveFolder);
router.post('/:workspaceId/spaces/:spaceId/folders/:folderId/restore', restoreFolder);

// Nested List routes
router.route('/:workspaceId/spaces/:spaceId/lists')
  .get(getLists)
  .post(createList);

router.route('/:workspaceId/spaces/:spaceId/lists/:listId')
  .get(getList)
  .put(updateList)
  .delete(deleteList);

router.post('/:workspaceId/spaces/:spaceId/lists/:listId/statuses', addListStatus);
router.put('/:workspaceId/spaces/:spaceId/lists/:listId/statuses/:statusId', updateListStatus);
router.delete('/:workspaceId/spaces/:spaceId/lists/:listId/statuses/:statusId', deleteListStatus);
router.post('/:workspaceId/spaces/:spaceId/lists/:listId/custom-fields', addCustomField);

// Nested Task routes
router.route('/:workspaceId/spaces/:spaceId/lists/:listId/tasks')
  .get(getTasks)
  .post(createTask);

router.route('/:workspaceId/spaces/:spaceId/lists/:listId/tasks/:taskId')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

export default router;
