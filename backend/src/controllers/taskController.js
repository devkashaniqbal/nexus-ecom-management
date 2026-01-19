import Task from '../models/Task.js';
import List from '../models/List.js';
import Space from '../models/Space.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';
import Watcher from '../models/Watcher.js';
import permissionService from '../services/permissionService.js';
import notificationService from '../services/notificationService.js';
import activityService from '../services/activityService.js';
import socketService from '../services/socketService.js';
import { updateTaskCounts } from './listController.js';

export const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, assignees, dueDate, startDate, tags, timeEstimate, parent } = req.body;
    // Support both params (from nested routes) and body
    const listId = req.params.listId || req.body.listId;

    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ status: 'error', message: 'List not found' });
    }

    const canCreate = await permissionService.checkSpacePermission(req.user._id, list.space, 'canCreateTasks');
    if (!canCreate) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    const taskCount = await Task.countDocuments({ list: listId, isDeleted: false, parent: parent || null });
    const defaultStatus = list.settings.statuses.find(s => s.isDefault) || list.settings.statuses[0];

    const taskData = {
      title,
      description,
      list: listId,
      space: list.space,
      folder: list.folder,
      workspace: list.workspace,
      parent: parent || null,
      order: taskCount,
      orderInStatus: taskCount,
      status: status || { id: defaultStatus.id, name: defaultStatus.name, color: defaultStatus.color },
      priority: priority || { level: 2, name: 'Normal', color: '#3B82F6' },
      creator: req.user._id,
      dueDate,
      startDate,
      tags: tags || [],
      timeEstimate: timeEstimate || 0
    };

    if (assignees && assignees.length > 0) {
      taskData.assignees = assignees.map(userId => ({
        user: userId,
        assignedAt: new Date(),
        assignedBy: req.user._id
      }));
      taskData.watchers = assignees;
    }

    const task = await Task.create(taskData);

    await Watcher.addWatcher('Task', task._id, req.user._id, task.workspace, { isAutoAdded: true });

    if (assignees && assignees.length > 0) {
      for (const assigneeId of assignees) {
        if (assigneeId.toString() !== req.user._id.toString()) {
          const assignee = await User.findById(assigneeId).select('firstName lastName email');
          await notificationService.notifyTaskAssigned(task, assignee, req.user);
          await Watcher.addWatcher('Task', task._id, assigneeId, task.workspace, { isAutoAdded: true });
        }
      }
    }

    await activityService.logTaskCreated(task, req.user);
    await updateTaskCounts(listId);

    socketService.emitToList(listId, 'task:created', { task });

    res.status(201).json({ status: 'success', data: { task } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getTasks = async (req, res) => {
  try {
    const { assignee, status, priority, dueDate, search, page = 1, limit = 50 } = req.query;
    // Support both params (from nested routes) and query
    const listId = req.params.listId || req.query.listId;
    const spaceId = req.params.spaceId || req.query.spaceId;
    const workspaceId = req.params.workspaceId || req.query.workspaceId;

    const query = { isDeleted: false, parent: null };

    if (listId) query.list = listId;
    if (spaceId) query.space = spaceId;
    if (workspaceId) query.workspace = workspaceId;
    if (assignee) query['assignees.user'] = assignee;
    if (status) query['status.id'] = status;
    if (priority) query['priority.level'] = parseInt(priority);
    if (dueDate) {
      const date = new Date(dueDate);
      query.dueDate = { $lte: new Date(date.setHours(23, 59, 59, 999)) };
    }
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tasks = await Task.find(query)
      .populate('assignees.user', 'firstName lastName profileImage')
      .populate('creator', 'firstName lastName')
      .populate('list', 'name color')
      .sort({ orderInStatus: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);

    res.json({
      status: 'success',
      data: { tasks, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getTask = async (req, res) => {
  try {
    const taskId = req.params.taskId || req.params.id;
    const task = await Task.findOne({ _id: taskId, isDeleted: false })
      .populate('assignees.user', 'firstName lastName profileImage email')
      .populate('watchers', 'firstName lastName profileImage')
      .populate('creator', 'firstName lastName profileImage')
      .populate('list', 'name color settings')
      .populate('space', 'name color')
      .populate('parent', 'title taskId');

    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    const canAccess = await permissionService.checkTaskPermission(req.user._id, task._id, 'canView');
    if (!canAccess) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    const subtasks = await Task.find({ parent: task._id, isDeleted: false })
      .populate('assignees.user', 'firstName lastName profileImage')
      .sort({ order: 1 });

    const comments = await Comment.find({ task: task._id, isDeleted: false, parent: null })
      .populate('author', 'firstName lastName profileImage')
      .sort({ createdAt: -1 })
      .limit(20);

    const activities = await activityService.getTaskActivity(task._id, { limit: 20 });

    res.json({ status: 'success', data: { task, subtasks, comments, activities } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, startDate, timeEstimate, tags, customFields } = req.body;
    const taskId = req.params.taskId || req.params.id;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    const canEdit = await permissionService.checkTaskPermission(req.user._id, task._id, 'canEdit');
    if (!canEdit) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    if (title) {
      await activityService.logTaskUpdated(task, req.user, 'title', task.title, title);
      task.title = title;
    }

    if (description !== undefined) {
      task.description = description;
    }

    if (status) {
      const oldStatus = task.status;
      task.status = status;
      await activityService.logTaskStatusChanged(task, req.user, oldStatus, status);
      await notificationService.notifyTaskStatusChanged(task, oldStatus, status, req.user);

      if (status.isClosed && !oldStatus.isClosed) {
        task.completedAt = new Date();
        task.completedBy = req.user._id;
      } else if (!status.isClosed && oldStatus.isClosed) {
        task.completedAt = null;
        task.completedBy = null;
      }
    }

    if (priority) {
      const oldPriority = task.priority;
      task.priority = priority;
      await activityService.logTaskPriorityChanged(task, req.user, oldPriority, priority);
    }

    if (dueDate !== undefined) {
      const oldDueDate = task.dueDate;
      task.dueDate = dueDate;
      await activityService.logTaskDueDateChanged(task, req.user, oldDueDate, dueDate);
    }

    if (startDate !== undefined) task.startDate = startDate;
    if (timeEstimate !== undefined) task.timeEstimate = timeEstimate;
    if (tags) task.tags = tags;
    if (customFields) task.customFields = customFields;

    await task.save();
    await updateTaskCounts(task.list);

    socketService.emitToTask(task._id, 'task:updated', { task });
    socketService.emitToList(task.list, 'task:updated', { task });

    res.json({ status: 'success', data: { task } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.taskId || req.params.id;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    const canDelete = await permissionService.checkTaskPermission(req.user._id, task._id, 'canDeleteTasks');
    if (!canDelete) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    task.isDeleted = true;
    task.deletedAt = new Date();
    task.deletedBy = req.user._id;
    await task.save();

    await Task.updateMany({ parent: task._id }, { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id });
    await updateTaskCounts(task.list);

    socketService.emitToList(task.list, 'task:deleted', { taskId: task._id });

    res.json({ status: 'success', message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const addAssignee = async (req, res) => {
  try {
    const { userId } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    if (task.assignees.some(a => a.user.toString() === userId)) {
      return res.status(400).json({ status: 'error', message: 'User is already assigned' });
    }

    const user = await User.findById(userId).select('firstName lastName email');
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    task.assignees.push({ user: userId, assignedAt: new Date(), assignedBy: req.user._id });
    if (!task.watchers.includes(userId)) {
      task.watchers.push(userId);
    }
    await task.save();

    await Watcher.addWatcher('Task', task._id, userId, task.workspace, { isAutoAdded: true, addedBy: req.user._id });
    await notificationService.notifyTaskAssigned(task, user, req.user);
    await activityService.logTaskAssigneeAdded(task, req.user, user);

    socketService.emitToTask(task._id, 'task:assigneeAdded', { taskId: task._id, assignee: user });

    res.json({ status: 'success', data: { task } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const removeAssignee = async (req, res) => {
  try {
    const { userId } = req.params;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    const assigneeIndex = task.assignees.findIndex(a => a.user.toString() === userId);
    if (assigneeIndex === -1) {
      return res.status(404).json({ status: 'error', message: 'Assignee not found' });
    }

    const user = await User.findById(userId).select('firstName lastName');
    task.assignees.splice(assigneeIndex, 1);
    await task.save();

    await activityService.logTaskAssigneeRemoved(task, req.user, user);

    socketService.emitToTask(task._id, 'task:assigneeRemoved', { taskId: task._id, userId });

    res.json({ status: 'success', data: { task } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const { content, mentions } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    const comment = await Comment.create({
      content,
      task: task._id,
      list: task.list,
      workspace: task.workspace,
      author: req.user._id,
      mentions: mentions || []
    });

    await comment.populate('author', 'firstName lastName profileImage');

    await notificationService.notifyCommentAdded(comment, task, req.user);

    if (mentions && mentions.length > 0) {
      await notificationService.notifyMention(comment, task, req.user, mentions);
    }

    await activityService.logCommentAdded(task, comment, req.user);

    socketService.emitToTask(task._id, 'comment:added', { comment });

    res.status(201).json({ status: 'success', data: { comment } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getComments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const comments = await Comment.find({ task: req.params.id, isDeleted: false, parent: null })
      .populate('author', 'firstName lastName profileImage')
      .populate({ path: 'replies', populate: { path: 'author', select: 'firstName lastName profileImage' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ status: 'success', data: { comments } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const addChecklist = async (req, res) => {
  try {
    const { name, items } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    const checklist = {
      id: `checklist_${Date.now()}`,
      name,
      order: task.checklists.length,
      items: (items || []).map((item, index) => ({
        id: `item_${Date.now()}_${index}`,
        text: item.text || item,
        isCompleted: false,
        order: index
      }))
    };

    task.checklists.push(checklist);
    await task.save();

    socketService.emitToTask(task._id, 'checklist:added', { taskId: task._id, checklist });

    res.json({ status: 'success', data: { task } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateChecklistItem = async (req, res) => {
  try {
    const { checklistId, itemId } = req.params;
    const { isCompleted, text } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    const checklist = task.checklists.find(c => c.id === checklistId);
    if (!checklist) {
      return res.status(404).json({ status: 'error', message: 'Checklist not found' });
    }

    const item = checklist.items.find(i => i.id === itemId);
    if (!item) {
      return res.status(404).json({ status: 'error', message: 'Item not found' });
    }

    if (isCompleted !== undefined) {
      item.isCompleted = isCompleted;
      if (isCompleted) {
        item.completedAt = new Date();
        item.completedBy = req.user._id;
        await activityService.logChecklistItemCompleted(task, checklist, item, req.user);
      } else {
        item.completedAt = null;
        item.completedBy = null;
      }
    }

    if (text) item.text = text;

    await task.save();

    socketService.emitToTask(task._id, 'checklist:itemUpdated', { taskId: task._id, checklistId, item });

    res.json({ status: 'success', data: { task } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const addAttachment = async (req, res) => {
  try {
    const { name, url, type, size } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    const attachment = {
      id: `attachment_${Date.now()}`,
      name,
      url,
      type,
      size,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };

    task.attachments.push(attachment);
    await task.save();

    await activityService.logAttachmentAdded(task, attachment, req.user);

    socketService.emitToTask(task._id, 'attachment:added', { taskId: task._id, attachment });

    res.json({ status: 'success', data: { task } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const startTimeTracking = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    const existingTracking = task.timeTracking.find(t => t.user.toString() === req.user._id.toString() && !t.endTime);
    if (existingTracking) {
      return res.status(400).json({ status: 'error', message: 'Time tracking already started' });
    }

    task.timeTracking.push({
      user: req.user._id,
      startTime: new Date()
    });

    await task.save();

    socketService.emitToTask(task._id, 'timeTracking:started', { taskId: task._id, userId: req.user._id });

    res.json({ status: 'success', data: { task } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const stopTimeTracking = async (req, res) => {
  try {
    const { description, isBillable } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    const tracking = task.timeTracking.find(t => t.user.toString() === req.user._id.toString() && !t.endTime);
    if (!tracking) {
      return res.status(400).json({ status: 'error', message: 'No active time tracking found' });
    }

    tracking.endTime = new Date();
    tracking.duration = Math.round((tracking.endTime - tracking.startTime) / 1000 / 60);
    tracking.description = description;
    tracking.isBillable = isBillable !== false;

    task.timeSpent += tracking.duration;
    await task.save();

    await activityService.logTimeTracked(task, tracking, req.user);

    socketService.emitToTask(task._id, 'timeTracking:stopped', { taskId: task._id, tracking });

    res.json({ status: 'success', data: { task } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const addDependency = async (req, res) => {
  try {
    const { dependsOnTaskId, type } = req.body;

    const task = await Task.findById(req.params.id);
    const dependsOnTask = await Task.findById(dependsOnTaskId);

    if (!task || !dependsOnTask) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    if (task.dependencies.some(d => d.task.toString() === dependsOnTaskId)) {
      return res.status(400).json({ status: 'error', message: 'Dependency already exists' });
    }

    task.dependencies.push({
      task: dependsOnTaskId,
      type: type || 'waiting_on',
      createdAt: new Date(),
      createdBy: req.user._id
    });

    await task.save();

    socketService.emitToTask(task._id, 'dependency:added', { taskId: task._id, dependency: { task: dependsOnTask, type } });

    res.json({ status: 'success', data: { task } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const moveTask = async (req, res) => {
  try {
    const { listId, status, order } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    const oldListId = task.list;

    if (listId && listId !== task.list.toString()) {
      const newList = await List.findById(listId);
      if (!newList) {
        return res.status(404).json({ status: 'error', message: 'List not found' });
      }

      task.list = listId;
      task.space = newList.space;
      task.folder = newList.folder;

      if (!status) {
        const defaultStatus = newList.settings.statuses.find(s => s.isDefault) || newList.settings.statuses[0];
        task.status = { id: defaultStatus.id, name: defaultStatus.name, color: defaultStatus.color };
      }
    }

    if (status) {
      task.status = status;
    }

    if (order !== undefined) {
      task.orderInStatus = order;
    }

    await task.save();

    if (listId && listId !== oldListId.toString()) {
      await updateTaskCounts(oldListId);
      await updateTaskCounts(listId);
      socketService.emitToList(oldListId, 'task:moved', { taskId: task._id, toListId: listId });
    }

    socketService.emitToList(task.list, 'task:updated', { task });

    res.json({ status: 'success', data: { task } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const watchTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    await Watcher.addWatcher('Task', task._id, req.user._id, task.workspace);

    if (!task.watchers.includes(req.user._id)) {
      task.watchers.push(req.user._id);
      await task.save();
    }

    res.json({ status: 'success', message: 'Now watching this task' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const unwatchTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    await Watcher.removeWatcher('Task', task._id, req.user._id);

    task.watchers = task.watchers.filter(w => w.toString() !== req.user._id.toString());
    await task.save();

    res.json({ status: 'success', message: 'No longer watching this task' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getMyTasks = async (req, res) => {
  try {
    const { workspaceId, status, dueDate, page = 1, limit = 50 } = req.query;

    const query = {
      'assignees.user': req.user._id,
      isDeleted: false,
      parent: null
    };

    if (workspaceId) query.workspace = workspaceId;
    if (status) query['status.id'] = status;
    if (dueDate === 'overdue') {
      query.dueDate = { $lt: new Date() };
      query['status.isClosed'] = { $ne: true };
    } else if (dueDate === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.dueDate = { $gte: today, $lt: tomorrow };
    } else if (dueDate === 'week') {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      query.dueDate = { $gte: today, $lt: nextWeek };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tasks = await Task.find(query)
      .populate('list', 'name color')
      .populate('space', 'name color')
      .sort({ dueDate: 1, 'priority.level': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);

    res.json({
      status: 'success',
      data: { tasks, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const reorderTasks = async (req, res) => {
  try {
    const { listId } = req.params;
    const { taskId, newPosition } = req.body;

    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ status: 'error', message: 'List not found' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    const oldPosition = task.order;

    // Update orders of affected tasks
    if (newPosition > oldPosition) {
      // Moving down: decrease order of tasks between old and new position
      await Task.updateMany(
        {
          list: listId,
          isDeleted: false,
          order: { $gt: oldPosition, $lte: newPosition }
        },
        { $inc: { order: -1 } }
      );
    } else if (newPosition < oldPosition) {
      // Moving up: increase order of tasks between new and old position
      await Task.updateMany(
        {
          list: listId,
          isDeleted: false,
          order: { $gte: newPosition, $lt: oldPosition }
        },
        { $inc: { order: 1 } }
      );
    }

    // Update the moved task's order
    task.order = newPosition;
    await task.save();

    // Emit reorder event
    socketService.emitToList(listId, 'task:reordered', {
      listId,
      taskId,
      newPosition
    });

    res.json({ status: 'success', message: 'Tasks reordered successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
