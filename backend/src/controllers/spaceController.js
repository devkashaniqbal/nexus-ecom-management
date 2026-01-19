import Space from '../models/Space.js';
import Workspace from '../models/Workspace.js';
import Folder from '../models/Folder.js';
import List from '../models/List.js';
import activityService from '../services/activityService.js';
import notificationService from '../services/notificationService.js';
import socketService from '../services/socketService.js';
import permissionService from '../services/permissionService.js';

export const createSpace = async (req, res) => {
  try {
    const { name, description, color, icon, isPrivate, features } = req.body;
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ status: 'error', message: 'Workspace not found' });
    }

    if (!workspace.hasPermission(req.user._id, 'canCreateSpaces')) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    const spaceCount = await Space.countDocuments({ workspace: workspaceId, isDeleted: false });

    const space = await Space.create({
      name,
      description,
      workspace: workspaceId,
      color,
      icon,
      order: spaceCount,
      isPrivate,
      members: [{
        user: req.user._id,
        role: 'admin',
        permissions: {
          canCreateFolders: true,
          canCreateLists: true,
          canCreateTasks: true,
          canEditTasks: true,
          canDeleteTasks: true,
          canManageMembers: true
        },
        addedAt: new Date()
      }],
      features: features || {},
      createdBy: req.user._id
    });

    workspace.usage.spacesCount++;
    await workspace.save();

    socketService.emitToWorkspace(workspaceId, 'space:created', { space });

    res.status(201).json({ status: 'success', data: { space } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getSpaces = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.isMember(req.user._id)) {
      return res.status(404).json({ status: 'error', message: 'Workspace not found' });
    }

    let query = { workspace: workspaceId, isDeleted: false };

    if (!workspace.hasPermission(req.user._id, 'canViewAllSpaces')) {
      query.$or = [
        { isPrivate: false },
        { 'members.user': req.user._id }
      ];
    }

    const spaces = await Space.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ order: 1 });

    res.json({ status: 'success', data: { spaces } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getSpace = async (req, res) => {
  try {
    const spaceId = req.params.spaceId || req.params.id;
    const space = await Space.findOne({
      _id: spaceId,
      isDeleted: false
    })
      .populate('members.user', 'firstName lastName email profileImage')
      .populate('createdBy', 'firstName lastName');

    if (!space) {
      return res.status(404).json({ status: 'error', message: 'Space not found' });
    }

    const canAccess = await permissionService.checkSpacePermission(req.user._id, space._id, 'canView');
    if (!canAccess) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    const folders = await Folder.find({ space: space._id, isDeleted: false }).sort({ order: 1 });
    const lists = await List.find({ space: space._id, folder: null, isDeleted: false }).sort({ order: 1 });

    res.json({ status: 'success', data: { space, folders, lists } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateSpace = async (req, res) => {
  try {
    const { name, description, color, icon, isPrivate, features, settings } = req.body;
    const spaceId = req.params.spaceId || req.params.id;

    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ status: 'error', message: 'Space not found' });
    }

    const canEdit = await permissionService.checkSpacePermission(req.user._id, space._id, 'canManageMembers');
    if (!canEdit) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    if (name) space.name = name;
    if (description !== undefined) space.description = description;
    if (color) space.color = color;
    if (icon) space.icon = icon;
    if (isPrivate !== undefined) space.isPrivate = isPrivate;
    if (features) space.features = { ...space.features.toObject(), ...features };
    if (settings) space.settings = { ...space.settings.toObject(), ...settings };

    await space.save();

    socketService.emitToWorkspace(space.workspace, 'space:updated', { space });

    res.json({ status: 'success', data: { space } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteSpace = async (req, res) => {
  try {
    const spaceId = req.params.spaceId || req.params.id;
    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ status: 'error', message: 'Space not found' });
    }

    const canDelete = await permissionService.checkWorkspacePermission(req.user._id, space.workspace, 'canCreateSpaces');
    if (!canDelete) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    space.isDeleted = true;
    space.deletedAt = new Date();
    space.deletedBy = req.user._id;
    await space.save();

    await Folder.updateMany({ space: space._id }, { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id });
    await List.updateMany({ space: space._id }, { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id });

    const workspace = await Workspace.findById(space.workspace);
    workspace.usage.spacesCount--;
    await workspace.save();

    socketService.emitToWorkspace(space.workspace, 'space:deleted', { spaceId: space._id });

    res.json({ status: 'success', message: 'Space deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const addSpaceMember = async (req, res) => {
  try {
    const { userId, role = 'member' } = req.body;
    const spaceId = req.params.spaceId || req.params.id;

    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ status: 'error', message: 'Space not found' });
    }

    const canManage = await permissionService.checkSpacePermission(req.user._id, space._id, 'canManageMembers');
    if (!canManage) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    if (space.isMember(userId)) {
      return res.status(400).json({ status: 'error', message: 'User is already a member' });
    }

    const user = await User.findById(userId).select('firstName lastName');
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    space.members.push({
      user: userId,
      role,
      permissions: {
        canCreateFolders: role !== 'viewer',
        canCreateLists: role !== 'viewer',
        canCreateTasks: role !== 'viewer',
        canEditTasks: role !== 'viewer',
        canDeleteTasks: role === 'admin',
        canManageMembers: role === 'admin'
      },
      addedAt: new Date(),
      addedBy: req.user._id
    });

    await space.save();

    await notificationService.create({
      recipient: userId,
      sender: req.user._id,
      type: 'space_added',
      title: 'Added to Space',
      message: `${req.user.firstName} added you to ${space.name}`,
      data: { workspace: space.workspace, space: space._id },
      channels: { inApp: true, email: false }
    });

    socketService.emitToWorkspace(space.workspace, 'space:memberAdded', { spaceId: space._id, member: user, role });

    res.json({ status: 'success', message: 'Member added successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const removeSpaceMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const spaceId = req.params.spaceId || req.params.id;

    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ status: 'error', message: 'Space not found' });
    }

    const canManage = await permissionService.checkSpacePermission(req.user._id, space._id, 'canManageMembers');
    if (!canManage) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    const memberIndex = space.members.findIndex(m => m.user.toString() === userId);
    if (memberIndex === -1) {
      return res.status(404).json({ status: 'error', message: 'Member not found' });
    }

    space.members.splice(memberIndex, 1);
    await space.save();

    socketService.emitToWorkspace(space.workspace, 'space:memberRemoved', { spaceId: space._id, userId });

    res.json({ status: 'success', message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const reorderSpaces = async (req, res) => {
  try {
    const { spaces } = req.body;

    for (const item of spaces) {
      await Space.findByIdAndUpdate(item.id, { order: item.order });
    }

    socketService.emitToWorkspace(req.params.workspaceId, 'spaces:reordered', { spaces });

    res.json({ status: 'success', message: 'Spaces reordered successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const archiveSpace = async (req, res) => {
  try {
    const spaceId = req.params.spaceId || req.params.id;
    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ status: 'error', message: 'Space not found' });
    }

    space.isArchived = true;
    space.archivedAt = new Date();
    space.archivedBy = req.user._id;
    await space.save();

    socketService.emitToWorkspace(space.workspace, 'space:archived', { spaceId: space._id });

    res.json({ status: 'success', message: 'Space archived successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const restoreSpace = async (req, res) => {
  try {
    const spaceId = req.params.spaceId || req.params.id;
    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ status: 'error', message: 'Space not found' });
    }

    space.isArchived = false;
    space.archivedAt = null;
    space.archivedBy = null;
    await space.save();

    socketService.emitToWorkspace(space.workspace, 'space:restored', { spaceId: space._id });

    res.json({ status: 'success', message: 'Space restored successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

import User from '../models/User.js';
