import Team from '../models/Team.js';
import Channel from '../models/Channel.js';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import notificationService from '../services/notificationService.js';
import socketService from '../services/socketService.js';
import roleService from '../services/roleService.js';

export const createTeam = async (req, res) => {
  try {
    const { name, description, workspaceId, type, color, members } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ status: 'error', message: 'Workspace not found' });
    }

    if (!workspace.hasPermission(req.user._id, 'canManageMembers')) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    const teamMembers = [{
      user: req.user._id,
      role: 'lead',
      joinedAt: new Date()
    }];

    if (members && members.length > 0) {
      for (const memberId of members) {
        if (memberId !== req.user._id.toString()) {
          teamMembers.push({
            user: memberId,
            role: 'member',
            joinedAt: new Date(),
            addedBy: req.user._id
          });
        }
      }
    }

    const team = await Team.create({
      name,
      description,
      workspace: workspaceId,
      type: type || 'custom',
      color,
      lead: req.user._id,
      members: teamMembers,
      createdBy: req.user._id
    });

    const generalChannel = await Channel.create({
      name: 'General',
      description: `General channel for ${name}`,
      workspace: workspaceId,
      team: team._id,
      type: 'public',
      members: teamMembers.map(m => ({ user: m.user, role: m.role === 'lead' ? 'admin' : 'member' })),
      createdBy: req.user._id
    });

    team.channels.push(generalChannel._id);
    team.settings.defaultChannel = generalChannel._id;
    await team.save();

    if (members && members.length > 0) {
      for (const memberId of members) {
        if (memberId !== req.user._id.toString()) {
          await notificationService.create({
            recipient: memberId,
            sender: req.user._id,
            type: 'team_added',
            title: 'Added to Team',
            message: `${req.user.firstName} added you to team "${name}"`,
            data: { workspace: workspaceId, team: team._id },
            channels: { inApp: true, email: true }
          });

          await roleService.logTeamAssignment(memberId, team._id, req.user);
        }
      }
    }

    socketService.emitToWorkspace(workspaceId, 'team:created', { team });

    res.status(201).json({ status: 'success', data: { team } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getTeams = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const teams = await Team.find({
      workspace: workspaceId,
      isDeleted: false,
      $or: [
        { 'members.user': req.user._id },
        { 'settings.isPrivate': false }
      ]
    })
      .populate('lead', 'firstName lastName profileImage')
      .populate('members.user', 'firstName lastName profileImage')
      .sort({ createdAt: -1 });

    res.json({ status: 'success', data: { teams } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getTeam = async (req, res) => {
  try {
    const team = await Team.findOne({ _id: req.params.id, isDeleted: false })
      .populate('lead', 'firstName lastName email profileImage')
      .populate('members.user', 'firstName lastName email profileImage department designation')
      .populate('channels', 'name type')
      .populate('linkedSpaces', 'name color')
      .populate('linkedProjects', 'name code');

    if (!team) {
      return res.status(404).json({ status: 'error', message: 'Team not found' });
    }

    if (team.settings.isPrivate && !team.isMember(req.user._id)) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    res.json({ status: 'success', data: { team } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateTeam = async (req, res) => {
  try {
    const { name, description, color, avatar, settings } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ status: 'error', message: 'Team not found' });
    }

    if (!team.isLead(req.user._id)) {
      return res.status(403).json({ status: 'error', message: 'Only team lead can update team' });
    }

    if (name) team.name = name;
    if (description !== undefined) team.description = description;
    if (color) team.color = color;
    if (avatar) team.avatar = avatar;
    if (settings) team.settings = { ...team.settings.toObject(), ...settings };

    await team.save();

    socketService.emitToWorkspace(team.workspace, 'team:updated', { team });

    res.json({ status: 'success', data: { team } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ status: 'error', message: 'Team not found' });
    }

    if (!team.isLead(req.user._id)) {
      const workspace = await Workspace.findById(team.workspace);
      if (!workspace.hasPermission(req.user._id, 'canManageMembers')) {
        return res.status(403).json({ status: 'error', message: 'Permission denied' });
      }
    }

    team.isDeleted = true;
    team.deletedAt = new Date();
    team.deletedBy = req.user._id;
    await team.save();

    await Channel.updateMany(
      { team: team._id },
      { isDeleted: true, deletedAt: new Date() }
    );

    socketService.emitToWorkspace(team.workspace, 'team:deleted', { teamId: team._id });

    res.json({ status: 'success', message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const addTeamMember = async (req, res) => {
  try {
    const { userId, role = 'member' } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ status: 'error', message: 'Team not found' });
    }

    if (!team.isLead(req.user._id) && !team.settings.allowMemberInvite) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    if (team.isMember(userId)) {
      return res.status(400).json({ status: 'error', message: 'User is already a team member' });
    }

    const user = await User.findById(userId).select('firstName lastName email');
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    await team.addMember(userId, req.user._id, role);

    await Channel.updateMany(
      { team: team._id, type: 'public' },
      { $push: { members: { user: userId, role: 'member', joinedAt: new Date() } } }
    );

    await notificationService.create({
      recipient: userId,
      sender: req.user._id,
      type: 'team_added',
      title: 'Added to Team',
      message: `${req.user.firstName} added you to team "${team.name}"`,
      data: { workspace: team.workspace, team: team._id },
      channels: { inApp: true, email: true }
    });

    socketService.emitToWorkspace(team.workspace, 'team:memberAdded', { teamId: team._id, member: user, role });

    res.json({ status: 'success', message: 'Member added successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const removeTeamMember = async (req, res) => {
  try {
    const { userId } = req.params;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ status: 'error', message: 'Team not found' });
    }

    if (!team.isLead(req.user._id) && req.user._id.toString() !== userId) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    if (team.lead?.toString() === userId) {
      return res.status(400).json({ status: 'error', message: 'Cannot remove team lead' });
    }

    await team.removeMember(userId);

    await Channel.updateMany(
      { team: team._id },
      { $pull: { members: { user: userId } } }
    );

    await notificationService.create({
      recipient: userId,
      sender: req.user._id,
      type: 'team_removed',
      title: 'Removed from Team',
      message: `You have been removed from team "${team.name}"`,
      data: { workspace: team.workspace },
      channels: { inApp: true, email: false }
    });

    socketService.emitToWorkspace(team.workspace, 'team:memberRemoved', { teamId: team._id, userId });

    res.json({ status: 'success', message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateMemberRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ status: 'error', message: 'Team not found' });
    }

    if (!team.isLead(req.user._id)) {
      return res.status(403).json({ status: 'error', message: 'Only team lead can change roles' });
    }

    const member = team.members.find(m => m.user.toString() === userId);
    if (!member) {
      return res.status(404).json({ status: 'error', message: 'Member not found' });
    }

    const previousRole = member.role;
    member.role = role;

    if (role === 'lead') {
      const currentLead = team.members.find(m => m.user.toString() === team.lead?.toString());
      if (currentLead) {
        currentLead.role = 'member';
      }
      team.lead = userId;
    }

    await team.save();

    await notificationService.create({
      recipient: userId,
      sender: req.user._id,
      type: 'team_role_changed',
      title: 'Team Role Updated',
      message: `Your role in "${team.name}" has been changed to ${role}`,
      data: { workspace: team.workspace, team: team._id },
      channels: { inApp: true, email: true }
    });

    socketService.emitToWorkspace(team.workspace, 'team:memberRoleChanged', { teamId: team._id, userId, previousRole, newRole: role });

    res.json({ status: 'success', message: 'Member role updated successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const linkSpace = async (req, res) => {
  try {
    const { spaceId } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ status: 'error', message: 'Team not found' });
    }

    if (!team.isLead(req.user._id)) {
      return res.status(403).json({ status: 'error', message: 'Only team lead can link spaces' });
    }

    if (!team.linkedSpaces.includes(spaceId)) {
      team.linkedSpaces.push(spaceId);
      await team.save();
    }

    res.json({ status: 'success', data: { team } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getMyTeams = async (req, res) => {
  try {
    const teams = await Team.find({
      'members.user': req.user._id,
      isDeleted: false
    })
      .populate('lead', 'firstName lastName profileImage')
      .populate('workspace', 'name')
      .sort({ createdAt: -1 });

    res.json({ status: 'success', data: { teams } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
