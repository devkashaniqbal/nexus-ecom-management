import Workspace from '../models/Workspace.js';
import Space from '../models/Space.js';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import { v4 as uuidv4 } from 'uuid';
import activityService from '../services/activityService.js';
import notificationService from '../services/notificationService.js';
import socketService from '../services/socketService.js';

export const createWorkspace = async (req, res) => {
  try {
    const { name, description, color } = req.body;

    const workspace = await Workspace.create({
      name,
      description,
      color,
      owner: req.user._id,
      members: [{
        user: req.user._id,
        role: 'owner',
        permissions: {
          canCreateSpaces: true,
          canManageMembers: true,
          canDeleteWorkspace: true,
          canManageSettings: true,
          canViewAllSpaces: true,
          canExportData: true
        },
        joinedAt: new Date()
      }]
    });

    workspace.usage.membersCount = 1;
    await workspace.save();

    res.status(201).json({ status: 'success', data: { workspace } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      'members.user': req.user._id,
      isDeleted: false
    })
      .populate('owner', 'firstName lastName email profileImage')
      .sort({ createdAt: -1 });

    res.json({ status: 'success', data: { workspaces } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findOne({
      _id: req.params.id,
      'members.user': req.user._id,
      isDeleted: false
    })
      .populate('owner', 'firstName lastName email profileImage')
      .populate('members.user', 'firstName lastName email profileImage role department');

    if (!workspace) {
      return res.status(404).json({ status: 'error', message: 'Workspace not found' });
    }

    res.json({ status: 'success', data: { workspace } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateWorkspace = async (req, res) => {
  try {
    const { name, description, color, settings } = req.body;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ status: 'error', message: 'Workspace not found' });
    }

    if (!workspace.hasPermission(req.user._id, 'canManageSettings')) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    if (color) workspace.color = color;
    if (settings) {
      workspace.settings = { ...workspace.settings.toObject(), ...settings };
    }

    await workspace.save();

    socketService.emitToWorkspace(workspace._id, 'workspace:updated', { workspace });

    res.json({ status: 'success', data: { workspace } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ status: 'error', message: 'Workspace not found' });
    }

    if (!workspace.hasPermission(req.user._id, 'canDeleteWorkspace')) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    workspace.isDeleted = true;
    workspace.deletedAt = new Date();
    workspace.deletedBy = req.user._id;
    await workspace.save();

    socketService.emitToWorkspace(workspace._id, 'workspace:deleted', { workspaceId: workspace._id });

    res.json({ status: 'success', message: 'Workspace deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const inviteMember = async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ status: 'error', message: 'Workspace not found' });
    }

    if (!workspace.hasPermission(req.user._id, 'canManageMembers')) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    if (workspace.isMember(user._id)) {
      return res.status(400).json({ status: 'error', message: 'User is already a member' });
    }

    const permissions = {
      canCreateSpaces: role === 'admin',
      canManageMembers: role === 'admin',
      canDeleteWorkspace: false,
      canManageSettings: role === 'admin',
      canViewAllSpaces: role !== 'guest',
      canExportData: role === 'admin'
    };

    workspace.members.push({
      user: user._id,
      role,
      permissions,
      joinedAt: new Date(),
      invitedBy: req.user._id
    });
    workspace.usage.membersCount = workspace.members.length;
    await workspace.save();

    await notificationService.create({
      recipient: user._id,
      sender: req.user._id,
      type: 'workspace_invited',
      title: 'Workspace Invitation',
      message: `${req.user.firstName} invited you to join ${workspace.name}`,
      data: {
        workspace: workspace._id,
        extra: {
          workspaceName: workspace.name,
          inviterName: `${req.user.firstName} ${req.user.lastName}`,
          role
        }
      },
      channels: { inApp: true, email: true }
    });

    await activityService.logMemberAdded(workspace, 'Workspace', user, req.user);

    socketService.emitToWorkspace(workspace._id, 'member:added', { member: user, role });

    res.json({ status: 'success', message: 'Member invited successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const removeMember = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    const userId = req.params.userId;

    if (!workspace) {
      return res.status(404).json({ status: 'error', message: 'Workspace not found' });
    }

    if (!workspace.hasPermission(req.user._id, 'canManageMembers')) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    if (workspace.owner.toString() === userId) {
      return res.status(400).json({ status: 'error', message: 'Cannot remove workspace owner' });
    }

    const memberIndex = workspace.members.findIndex(m => m.user.toString() === userId);
    if (memberIndex === -1) {
      return res.status(404).json({ status: 'error', message: 'Member not found' });
    }

    workspace.members.splice(memberIndex, 1);
    workspace.usage.membersCount = workspace.members.length;
    await workspace.save();

    const user = await User.findById(userId).select('firstName lastName');
    await activityService.logMemberRemoved(workspace, 'Workspace', user, req.user);

    socketService.emitToWorkspace(workspace._id, 'member:removed', { userId });
    socketService.emitToUser(userId, 'workspace:removed', { workspaceId: workspace._id });

    res.json({ status: 'success', message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    const workspace = await Workspace.findById(req.params.id);
    const userId = req.params.userId;

    if (!workspace) {
      return res.status(404).json({ status: 'error', message: 'Workspace not found' });
    }

    if (!workspace.hasPermission(req.user._id, 'canManageMembers')) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    if (workspace.owner.toString() === userId) {
      return res.status(400).json({ status: 'error', message: 'Cannot change owner role' });
    }

    const member = workspace.members.find(m => m.user.toString() === userId);
    if (!member) {
      return res.status(404).json({ status: 'error', message: 'Member not found' });
    }

    const previousRole = member.role;
    member.role = role;

    member.permissions = {
      canCreateSpaces: role === 'admin',
      canManageMembers: role === 'admin',
      canDeleteWorkspace: false,
      canManageSettings: role === 'admin',
      canViewAllSpaces: role !== 'guest',
      canExportData: role === 'admin'
    };

    await workspace.save();

    await notificationService.create({
      recipient: userId,
      sender: req.user._id,
      type: 'workspace_role_changed',
      title: 'Workspace Role Updated',
      message: `Your role in ${workspace.name} has been changed to ${role}`,
      data: { workspace: workspace._id },
      channels: { inApp: true, email: true }
    });

    socketService.emitToWorkspace(workspace._id, 'member:roleChanged', { userId, previousRole, newRole: role });

    res.json({ status: 'success', message: 'Member role updated successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createInviteLink = async (req, res) => {
  try {
    const { role = 'member', expiresInDays = 7, usageLimit } = req.body;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ status: 'error', message: 'Workspace not found' });
    }

    if (!workspace.hasPermission(req.user._id, 'canManageMembers')) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    const inviteLink = {
      code: uuidv4(),
      role,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      usageLimit,
      createdBy: req.user._id,
      isActive: true
    };

    workspace.inviteLinks.push(inviteLink);
    await workspace.save();

    res.json({
      status: 'success',
      data: {
        inviteLink: `${process.env.FRONTEND_URL}/invite/${inviteLink.code}`,
        ...inviteLink
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const joinByInviteLink = async (req, res) => {
  try {
    const { code } = req.params;

    const workspace = await Workspace.findOne({
      'inviteLinks.code': code,
      'inviteLinks.isActive': true,
      isDeleted: false
    });

    if (!workspace) {
      return res.status(404).json({ status: 'error', message: 'Invalid or expired invite link' });
    }

    const inviteLink = workspace.inviteLinks.find(l => l.code === code);

    if (inviteLink.expiresAt && new Date() > inviteLink.expiresAt) {
      return res.status(400).json({ status: 'error', message: 'Invite link has expired' });
    }

    if (inviteLink.usageLimit && inviteLink.usageCount >= inviteLink.usageLimit) {
      return res.status(400).json({ status: 'error', message: 'Invite link usage limit reached' });
    }

    if (workspace.isMember(req.user._id)) {
      return res.status(400).json({ status: 'error', message: 'You are already a member of this workspace' });
    }

    workspace.members.push({
      user: req.user._id,
      role: inviteLink.role,
      permissions: {
        canCreateSpaces: inviteLink.role === 'admin',
        canManageMembers: inviteLink.role === 'admin',
        canDeleteWorkspace: false,
        canManageSettings: inviteLink.role === 'admin',
        canViewAllSpaces: inviteLink.role !== 'guest',
        canExportData: inviteLink.role === 'admin'
      },
      joinedAt: new Date(),
      invitedBy: inviteLink.createdBy
    });

    inviteLink.usageCount++;
    workspace.usage.membersCount = workspace.members.length;
    await workspace.save();

    socketService.emitToWorkspace(workspace._id, 'member:added', {
      member: req.user,
      role: inviteLink.role
    });

    res.json({ status: 'success', data: { workspace } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getWorkspaceActivity = async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace || !workspace.isMember(req.user._id)) {
      return res.status(404).json({ status: 'error', message: 'Workspace not found' });
    }

    const activities = await activityService.getWorkspaceActivity(req.params.id, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    res.json({ status: 'success', data: { activities } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
