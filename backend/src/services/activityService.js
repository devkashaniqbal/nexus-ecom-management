import Activity from '../models/Activity.js';
import socketService from './socketService.js';
import logger from '../utils/logger.js';

class ActivityService {
  async log(data) {
    try {
      const activity = await Activity.log(data);

      if (data.workspace) {
        socketService.emitToWorkspace(data.workspace, 'activity:new', {
          activity: await activity.populate('user', 'firstName lastName profileImage')
        });
      }

      return activity;
    } catch (error) {
      logger.error('Error logging activity:', error);
      throw error;
    }
  }

  async logTaskCreated(task, user) {
    return this.log({
      workspace: task.workspace,
      user: user._id,
      action: 'created',
      resourceType: 'Task',
      resourceId: task._id,
      resourceName: task.title,
      parentResource: {
        type: 'List',
        id: task.list,
        name: task.listName
      }
    });
  }

  async logTaskUpdated(task, user, field, before, after) {
    return this.log({
      workspace: task.workspace,
      user: user._id,
      action: 'updated',
      resourceType: 'Task',
      resourceId: task._id,
      resourceName: task.title,
      changes: { field, before, after }
    });
  }

  async logTaskStatusChanged(task, user, oldStatus, newStatus) {
    return this.log({
      workspace: task.workspace,
      user: user._id,
      action: 'status_changed',
      resourceType: 'Task',
      resourceId: task._id,
      resourceName: task.title,
      changes: {
        field: 'status',
        before: oldStatus,
        after: newStatus
      }
    });
  }

  async logTaskPriorityChanged(task, user, oldPriority, newPriority) {
    return this.log({
      workspace: task.workspace,
      user: user._id,
      action: 'priority_changed',
      resourceType: 'Task',
      resourceId: task._id,
      resourceName: task.title,
      changes: {
        field: 'priority',
        before: oldPriority,
        after: newPriority
      }
    });
  }

  async logTaskAssigneeAdded(task, user, assignee) {
    return this.log({
      workspace: task.workspace,
      user: user._id,
      action: 'assignee_added',
      resourceType: 'Task',
      resourceId: task._id,
      resourceName: task.title,
      metadata: {
        assigneeId: assignee._id,
        assigneeName: `${assignee.firstName} ${assignee.lastName}`
      }
    });
  }

  async logTaskAssigneeRemoved(task, user, assignee) {
    return this.log({
      workspace: task.workspace,
      user: user._id,
      action: 'assignee_removed',
      resourceType: 'Task',
      resourceId: task._id,
      resourceName: task.title,
      metadata: {
        assigneeId: assignee._id,
        assigneeName: `${assignee.firstName} ${assignee.lastName}`
      }
    });
  }

  async logTaskDueDateChanged(task, user, oldDate, newDate) {
    return this.log({
      workspace: task.workspace,
      user: user._id,
      action: 'due_date_changed',
      resourceType: 'Task',
      resourceId: task._id,
      resourceName: task.title,
      changes: {
        field: 'dueDate',
        before: oldDate,
        after: newDate
      }
    });
  }

  async logCommentAdded(task, comment, user) {
    return this.log({
      workspace: task.workspace,
      user: user._id,
      action: 'comment_added',
      resourceType: 'Task',
      resourceId: task._id,
      resourceName: task.title,
      metadata: { commentId: comment._id },
      mentions: comment.mentions
    });
  }

  async logAttachmentAdded(task, attachment, user) {
    return this.log({
      workspace: task.workspace,
      user: user._id,
      action: 'attachment_added',
      resourceType: 'Task',
      resourceId: task._id,
      resourceName: task.title,
      metadata: {
        attachmentId: attachment.id,
        attachmentName: attachment.name
      }
    });
  }

  async logSubtaskAdded(task, subtask, user) {
    return this.log({
      workspace: task.workspace,
      user: user._id,
      action: 'subtask_added',
      resourceType: 'Task',
      resourceId: task._id,
      resourceName: task.title,
      metadata: {
        subtaskId: subtask._id,
        subtaskTitle: subtask.title
      }
    });
  }

  async logSubtaskCompleted(task, subtask, user) {
    return this.log({
      workspace: task.workspace,
      user: user._id,
      action: 'subtask_completed',
      resourceType: 'Task',
      resourceId: task._id,
      resourceName: task.title,
      metadata: {
        subtaskId: subtask._id,
        subtaskTitle: subtask.title
      }
    });
  }

  async logChecklistItemCompleted(task, checklist, item, user) {
    return this.log({
      workspace: task.workspace,
      user: user._id,
      action: 'checklist_item_completed',
      resourceType: 'Task',
      resourceId: task._id,
      resourceName: task.title,
      metadata: {
        checklistId: checklist.id,
        checklistName: checklist.name,
        itemId: item.id,
        itemText: item.text
      }
    });
  }

  async logTimeTracked(task, timeEntry, user) {
    return this.log({
      workspace: task.workspace,
      user: user._id,
      action: 'time_tracked',
      resourceType: 'Task',
      resourceId: task._id,
      resourceName: task.title,
      metadata: {
        duration: timeEntry.duration,
        description: timeEntry.description
      }
    });
  }

  async logMemberAdded(resource, resourceType, member, user) {
    return this.log({
      workspace: resource.workspace,
      user: user._id,
      action: 'member_added',
      resourceType,
      resourceId: resource._id,
      resourceName: resource.name,
      metadata: {
        memberId: member._id,
        memberName: `${member.firstName} ${member.lastName}`
      }
    });
  }

  async logMemberRemoved(resource, resourceType, member, user) {
    return this.log({
      workspace: resource.workspace,
      user: user._id,
      action: 'member_removed',
      resourceType,
      resourceId: resource._id,
      resourceName: resource.name,
      metadata: {
        memberId: member._id,
        memberName: `${member.firstName} ${member.lastName}`
      }
    });
  }

  async getTaskActivity(taskId, options = {}) {
    return Activity.getForResource('Task', taskId, options);
  }

  async getWorkspaceActivity(workspaceId, options = {}) {
    return Activity.getForWorkspace(workspaceId, options);
  }

  async getUserActivity(userId, workspaceId, options = {}) {
    return Activity.getForWorkspace(workspaceId, { ...options, userId });
  }
}

const activityService = new ActivityService();
export default activityService;
