import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createTeam,
  getTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  updateMemberRole,
  linkSpace,
  getMyTeams
} from '../controllers/teamController.js';

const router = express.Router();

router.use(protect);

router.get('/my-teams', getMyTeams);

router.get('/workspace/:workspaceId', getTeams);
router.post('/', createTeam);

router.route('/:id')
  .get(getTeam)
  .put(updateTeam)
  .delete(deleteTeam);

router.post('/:id/members', addTeamMember);
router.delete('/:id/members/:userId', removeTeamMember);
router.put('/:id/members/:userId/role', updateMemberRole);
router.post('/:id/link-space', linkSpace);

export default router;
