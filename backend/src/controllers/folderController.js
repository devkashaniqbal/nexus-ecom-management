import Folder from '../models/Folder.js';
import Space from '../models/Space.js';
import List from '../models/List.js';
import permissionService from '../services/permissionService.js';
import socketService from '../services/socketService.js';

export const createFolder = async (req, res) => {
  try {
    const { name, spaceId, color, icon, settings } = req.body;

    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ status: 'error', message: 'Space not found' });
    }

    const canCreate = await permissionService.checkSpacePermission(req.user._id, spaceId, 'canCreateFolders');
    if (!canCreate) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    const folderCount = await Folder.countDocuments({ space: spaceId, isDeleted: false });

    const folder = await Folder.create({
      name,
      space: spaceId,
      workspace: space.workspace,
      color,
      icon,
      order: folderCount,
      settings: settings || {},
      createdBy: req.user._id
    });

    socketService.emitToSpace(spaceId, 'folder:created', { folder });

    res.status(201).json({ status: 'success', data: { folder } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getFolders = async (req, res) => {
  try {
    const { spaceId } = req.params;

    const folders = await Folder.find({ space: spaceId, isDeleted: false })
      .populate('createdBy', 'firstName lastName')
      .sort({ order: 1 });

    for (let folder of folders) {
      folder = folder.toObject();
      folder.lists = await List.find({ folder: folder._id, isDeleted: false }).sort({ orderInFolder: 1 });
    }

    res.json({ status: 'success', data: { folders } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getFolder = async (req, res) => {
  try {
    const folderId = req.params.folderId || req.params.id;
    const folder = await Folder.findOne({ _id: folderId, isDeleted: false })
      .populate('createdBy', 'firstName lastName');

    if (!folder) {
      return res.status(404).json({ status: 'error', message: 'Folder not found' });
    }

    const lists = await List.find({ folder: folder._id, isDeleted: false })
      .populate('createdBy', 'firstName lastName')
      .sort({ orderInFolder: 1 });

    res.json({ status: 'success', data: { folder, lists } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateFolder = async (req, res) => {
  try {
    const { name, color, icon, isHidden, settings } = req.body;
    const folderId = req.params.folderId || req.params.id;

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ status: 'error', message: 'Folder not found' });
    }

    const canEdit = await permissionService.checkSpacePermission(req.user._id, folder.space, 'canCreateFolders');
    if (!canEdit) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    if (name) folder.name = name;
    if (color) folder.color = color;
    if (icon) folder.icon = icon;
    if (isHidden !== undefined) folder.isHidden = isHidden;
    if (settings) folder.settings = { ...folder.settings.toObject(), ...settings };

    await folder.save();

    socketService.emitToSpace(folder.space, 'folder:updated', { folder });

    res.json({ status: 'success', data: { folder } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteFolder = async (req, res) => {
  try {
    const { moveListsTo } = req.body;
    const folderId = req.params.folderId || req.params.id;

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ status: 'error', message: 'Folder not found' });
    }

    const canDelete = await permissionService.checkSpacePermission(req.user._id, folder.space, 'canDeleteTasks');
    if (!canDelete) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    if (moveListsTo) {
      await List.updateMany({ folder: folder._id }, { folder: moveListsTo });
    } else {
      await List.updateMany({ folder: folder._id }, { folder: null });
    }

    folder.isDeleted = true;
    folder.deletedAt = new Date();
    folder.deletedBy = req.user._id;
    await folder.save();

    socketService.emitToSpace(folder.space, 'folder:deleted', { folderId: folder._id });

    res.json({ status: 'success', message: 'Folder deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const reorderFolders = async (req, res) => {
  try {
    const { folders } = req.body;

    for (const item of folders) {
      await Folder.findByIdAndUpdate(item.id, { order: item.order });
    }

    res.json({ status: 'success', message: 'Folders reordered successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const archiveFolder = async (req, res) => {
  try {
    const folderId = req.params.folderId || req.params.id;
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ status: 'error', message: 'Folder not found' });
    }

    folder.isArchived = true;
    folder.archivedAt = new Date();
    folder.archivedBy = req.user._id;
    await folder.save();

    await List.updateMany(
      { folder: folder._id },
      { isArchived: true, archivedAt: new Date(), archivedBy: req.user._id }
    );

    socketService.emitToSpace(folder.space, 'folder:archived', { folderId: folder._id });

    res.json({ status: 'success', message: 'Folder archived successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const restoreFolder = async (req, res) => {
  try {
    const folderId = req.params.folderId || req.params.id;
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ status: 'error', message: 'Folder not found' });
    }

    folder.isArchived = false;
    folder.archivedAt = null;
    folder.archivedBy = null;
    await folder.save();

    await List.updateMany(
      { folder: folder._id },
      { isArchived: false, archivedAt: null, archivedBy: null }
    );

    socketService.emitToSpace(folder.space, 'folder:restored', { folderId: folder._id });

    res.json({ status: 'success', message: 'Folder restored successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
