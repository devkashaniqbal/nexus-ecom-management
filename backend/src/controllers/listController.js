import List from '../models/List.js';
import Folder from '../models/Folder.js';
import Space from '../models/Space.js';
import Task from '../models/Task.js';
import permissionService from '../services/permissionService.js';
import socketService from '../services/socketService.js';

export const createList = async (req, res) => {
  try {
    const { name, folderId, color, icon, settings } = req.body;
    // Support both params (from nested routes) and body
    const spaceId = req.params.spaceId || req.body.spaceId;

    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ status: 'error', message: 'Space not found' });
    }

    const canCreate = await permissionService.checkSpacePermission(req.user._id, spaceId, 'canCreateLists');
    if (!canCreate) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    if (folderId) {
      const folder = await Folder.findById(folderId);
      if (!folder || folder.space.toString() !== spaceId) {
        return res.status(404).json({ status: 'error', message: 'Folder not found' });
      }
    }

    const listCount = await List.countDocuments({
      space: spaceId,
      folder: folderId || null,
      isDeleted: false
    });

    const list = await List.create({
      name,
      space: spaceId,
      folder: folderId || null,
      workspace: space.workspace,
      color,
      icon,
      order: listCount,
      orderInFolder: folderId ? listCount : 0,
      settings: settings || {},
      createdBy: req.user._id
    });

    socketService.emitToSpace(spaceId, 'list:created', { list });

    res.status(201).json({ status: 'success', data: { list } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getLists = async (req, res) => {
  try {
    // Support both params (from nested routes) and query
    const spaceId = req.params.spaceId || req.query.spaceId;
    const folderId = req.params.folderId || req.query.folderId;

    const query = { isDeleted: false };
    if (spaceId) query.space = spaceId;
    if (folderId) query.folder = folderId;
    else if (spaceId && !folderId) query.folder = null;

    const lists = await List.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('assignees', 'firstName lastName profileImage')
      .sort({ order: 1 });

    res.json({ status: 'success', data: { lists } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getList = async (req, res) => {
  try {
    const listId = req.params.listId || req.params.id;
    const list = await List.findOne({ _id: listId, isDeleted: false })
      .populate('createdBy', 'firstName lastName')
      .populate('assignees', 'firstName lastName profileImage')
      .populate('watchers', 'firstName lastName profileImage');

    if (!list) {
      return res.status(404).json({ status: 'error', message: 'List not found' });
    }

    const canAccess = await permissionService.checkListPermission(req.user._id, list._id, 'canView');
    if (!canAccess) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    const tasks = await Task.find({ list: list._id, isDeleted: false, parent: null })
      .populate('assignees.user', 'firstName lastName profileImage')
      .populate('creator', 'firstName lastName')
      .sort({ orderInStatus: 1 });

    res.json({ status: 'success', data: { list, tasks } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateList = async (req, res) => {
  try {
    const { name, color, icon, settings, dueDate, startDate, priority } = req.body;
    const listId = req.params.listId || req.params.id;

    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ status: 'error', message: 'List not found' });
    }

    const canEdit = await permissionService.checkSpacePermission(req.user._id, list.space, 'canCreateLists');
    if (!canEdit) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    if (name) list.name = name;
    if (color) list.color = color;
    if (icon) list.icon = icon;
    if (settings) list.settings = { ...list.settings.toObject(), ...settings };
    if (dueDate !== undefined) list.dueDate = dueDate;
    if (startDate !== undefined) list.startDate = startDate;
    if (priority !== undefined) list.priority = priority;

    await list.save();

    socketService.emitToSpace(list.space, 'list:updated', { list });

    res.json({ status: 'success', data: { list } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteList = async (req, res) => {
  try {
    const listId = req.params.listId || req.params.id;
    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ status: 'error', message: 'List not found' });
    }

    const canDelete = await permissionService.checkSpacePermission(req.user._id, list.space, 'canDeleteTasks');
    if (!canDelete) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    list.isDeleted = true;
    list.deletedAt = new Date();
    list.deletedBy = req.user._id;
    await list.save();

    await Task.updateMany(
      { list: list._id },
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id }
    );

    socketService.emitToSpace(list.space, 'list:deleted', { listId: list._id });

    res.json({ status: 'success', message: 'List deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const moveList = async (req, res) => {
  try {
    const { folderId, order } = req.body;
    const listId = req.params.listId || req.params.id;

    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ status: 'error', message: 'List not found' });
    }

    if (folderId) {
      const folder = await Folder.findById(folderId);
      if (!folder || folder.space.toString() !== list.space.toString()) {
        return res.status(404).json({ status: 'error', message: 'Folder not found' });
      }
    }

    list.folder = folderId || null;
    if (order !== undefined) list.order = order;
    await list.save();

    socketService.emitToSpace(list.space, 'list:moved', { list });

    res.json({ status: 'success', data: { list } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const reorderLists = async (req, res) => {
  try {
    const { lists } = req.body;

    for (const item of lists) {
      await List.findByIdAndUpdate(item.id, { order: item.order, orderInFolder: item.orderInFolder });
    }

    res.json({ status: 'success', message: 'Lists reordered successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const addListStatus = async (req, res) => {
  try {
    const { name, color, order, isClosed } = req.body;
    const listId = req.params.listId || req.params.id;

    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ status: 'error', message: 'List not found' });
    }

    const statusId = `status_${Date.now()}`;
    list.settings.statuses.push({
      id: statusId,
      name,
      color,
      order: order || list.settings.statuses.length,
      isDefault: false,
      isClosed: isClosed || false
    });

    await list.save();

    socketService.emitToList(list._id, 'list:statusAdded', { listId: list._id, status: list.settings.statuses.slice(-1)[0] });

    res.json({ status: 'success', data: { list } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateListStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const { name, color, order, isClosed } = req.body;
    const listId = req.params.listId || req.params.id;

    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ status: 'error', message: 'List not found' });
    }

    const status = list.settings.statuses.find(s => s.id === statusId);
    if (!status) {
      return res.status(404).json({ status: 'error', message: 'Status not found' });
    }

    if (name) status.name = name;
    if (color) status.color = color;
    if (order !== undefined) status.order = order;
    if (isClosed !== undefined) status.isClosed = isClosed;

    await list.save();

    socketService.emitToList(list._id, 'list:statusUpdated', { listId: list._id, status });

    res.json({ status: 'success', data: { list } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteListStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const { moveTasksTo } = req.body;
    const listId = req.params.listId || req.params.id;

    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ status: 'error', message: 'List not found' });
    }

    const statusIndex = list.settings.statuses.findIndex(s => s.id === statusId);
    if (statusIndex === -1) {
      return res.status(404).json({ status: 'error', message: 'Status not found' });
    }

    if (moveTasksTo) {
      const newStatus = list.settings.statuses.find(s => s.id === moveTasksTo);
      if (newStatus) {
        await Task.updateMany(
          { list: list._id, 'status.id': statusId },
          { status: { id: newStatus.id, name: newStatus.name, color: newStatus.color } }
        );
      }
    }

    list.settings.statuses.splice(statusIndex, 1);
    await list.save();

    socketService.emitToList(list._id, 'list:statusDeleted', { listId: list._id, statusId });

    res.json({ status: 'success', data: { list } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const addCustomField = async (req, res) => {
  try {
    const { name, type, options, isRequired, isVisible } = req.body;
    const listId = req.params.listId || req.params.id;

    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ status: 'error', message: 'List not found' });
    }

    const fieldId = `field_${Date.now()}`;
    list.settings.customFields.push({
      id: fieldId,
      name,
      type,
      options: options || [],
      isRequired: isRequired || false,
      isVisible: isVisible !== false,
      order: list.settings.customFields.length
    });

    await list.save();

    socketService.emitToList(list._id, 'list:customFieldAdded', { listId: list._id, field: list.settings.customFields.slice(-1)[0] });

    res.json({ status: 'success', data: { list } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateTaskCounts = async (listId) => {
  const taskCount = await Task.countDocuments({ list: listId, isDeleted: false, parent: null });
  const completedTaskCount = await Task.countDocuments({
    list: listId,
    isDeleted: false,
    parent: null,
    'status.isClosed': true
  });

  await List.findByIdAndUpdate(listId, { taskCount, completedTaskCount });
};
