import Notification from '../models/Notification.js';
import Watcher from '../models/Watcher.js';
import User from '../models/User.js';
import socketService from './socketService.js';
import emailService from './emailService.js';
import logger from '../utils/logger.js';

class NotificationService {
  async create(data) {
    try {
      const notification = await Notification.createNotification(data);

      if (data.channels?.inApp !== false) {
        socketService.emitToUser(data.recipient, 'notification:new', {
          notification: await notification.populate('sender', 'firstName lastName profileImage')
        });
      }

      if (data.channels?.email) {
        await this.sendEmailNotification(notification);
      }

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  async createBulk(recipients, baseData) {
    try {
      const notifications = await Notification.createBulkNotifications(recipients, baseData);

      for (const notification of notifications) {
        if (baseData.channels?.inApp !== false) {
          socketService.emitToUser(notification.recipient, 'notification:new', { notification });
        }
      }

      if (baseData.channels?.email) {
        const users = await User.find({ _id: { $in: recipients } }).select('email preferences');
        const emailRecipients = users.filter(u => u.preferences?.notifications?.email !== false);
        for (const user of emailRecipients) {
          await this.sendEmailNotification({ ...baseData, recipient: user });
        }
      }

      return notifications;
    } catch (error) {
      logger.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  async sendEmailNotification(notification) {
    try {
      const recipient = await User.findById(notification.recipient).select('email firstName preferences');
      if (!recipient || recipient.preferences?.notifications?.email === false) return;

      const templateMap = {
        task_assigned: 'taskAssigned',
        comment_mention: 'commentMention',
        role_changed: 'roleChanged',
        promoted: 'promotion',
        handover_required: 'handoverRequired',
        task_due_soon: 'dueDateReminder',
        workspace_invited: 'workspaceInvite',
        team_message: 'teamMessage'
      };

      const templateName = templateMap[notification.type];
      if (templateName) {
        await emailService.sendTemplate(templateName, recipient.email, {
          recipientName: recipient.firstName,
          ...notification.data?.extra
        });
      }
    } catch (error) {
      logger.error('Error sending email notification:', error);
    }
  }

  async notifyTaskAssigned(task, assignee, assigner) {
    const watchers = await Watcher.getWatchers('Task', task._id);
    const watcherIds = watchers.map(w => w.user._id.toString());

    await this.create({
      recipient: assignee._id,
      sender: assigner._id,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `${assigner.firstName} ${assigner.lastName} assigned you to "${task.title}"`,
      data: {
        workspace: task.workspace,
        space: task.space,
        list: task.list,
        task: task._id,
        extra: {
          taskTitle: task.title,
          taskDescription: task.description?.substring(0, 200),
          assignerName: `${assigner.firstName} ${assigner.lastName}`,
          assigneeName: `${assignee.firstName}`,
          dueDate: task.dueDate?.toLocaleDateString(),
          taskUrl: `${process.env.FRONTEND_URL}/tasks/${task._id}`
        }
      },
      link: `/tasks/${task._id}`,
      channels: { inApp: true, email: true }
    });

    const otherWatchers = watcherIds.filter(id => id !== assignee._id.toString() && id !== assigner._id.toString());
    if (otherWatchers.length > 0) {
      await this.createBulk(otherWatchers, {
        sender: assigner._id,
        type: 'task_updated',
        title: 'Task Assignee Added',
        message: `${assigner.firstName} assigned ${assignee.firstName} to "${task.title}"`,
        data: { workspace: task.workspace, task: task._id },
        link: `/tasks/${task._id}`,
        channels: { inApp: true, email: false }
      });
    }
  }

  async notifyTaskStatusChanged(task, oldStatus, newStatus, changedBy) {
    const watchers = await Watcher.getWatchers('Task', task._id);
    const recipients = watchers
      .filter(w => w.user._id.toString() !== changedBy._id.toString())
      .map(w => w.user._id);

    if (recipients.length > 0) {
      await this.createBulk(recipients, {
        sender: changedBy._id,
        type: 'task_status_changed',
        title: 'Task Status Changed',
        message: `${changedBy.firstName} changed "${task.title}" from ${oldStatus.name} to ${newStatus.name}`,
        data: { workspace: task.workspace, task: task._id },
        link: `/tasks/${task._id}`,
        channels: { inApp: true, email: false }
      });
    }
  }

  async notifyCommentAdded(comment, task, author) {
    const watchers = await Watcher.getWatchers('Task', task._id);
    const recipients = watchers
      .filter(w => w.user._id.toString() !== author._id.toString())
      .map(w => w.user._id);

    if (recipients.length > 0) {
      await this.createBulk(recipients, {
        sender: author._id,
        type: 'comment_added',
        title: 'New Comment',
        message: `${author.firstName} commented on "${task.title}"`,
        data: { workspace: task.workspace, task: task._id, comment: comment._id },
        link: `/tasks/${task._id}`,
        channels: { inApp: true, email: false }
      });
    }
  }

  async notifyMention(comment, task, author, mentionedUsers) {
    for (const userId of mentionedUsers) {
      if (userId.toString() === author._id.toString()) continue;

      const user = await User.findById(userId).select('firstName email');
      if (!user) continue;

      await this.create({
        recipient: userId,
        sender: author._id,
        type: 'comment_mention',
        title: 'You were mentioned',
        message: `${author.firstName} mentioned you in "${task.title}"`,
        data: {
          workspace: task.workspace,
          task: task._id,
          comment: comment._id,
          extra: {
            authorName: `${author.firstName} ${author.lastName}`,
            taskTitle: task.title,
            commentContent: comment.content.substring(0, 200),
            taskUrl: `${process.env.FRONTEND_URL}/tasks/${task._id}`
          }
        },
        link: `/tasks/${task._id}`,
        priority: 'high',
        channels: { inApp: true, email: true }
      });
    }
  }

  async notifyRoleChanged(user, change, changedBy) {
    await this.create({
      recipient: user._id,
      sender: changedBy._id,
      type: change.changeType === 'promotion' ? 'promoted' : change.changeType === 'demotion' ? 'demoted' : 'role_changed',
      title: change.changeType === 'promotion' ? 'Congratulations!' : 'Role Updated',
      message: change.changeType === 'promotion'
        ? `You have been promoted to ${change.newValue.role || change.newValue.designation}`
        : `Your role has been changed to ${change.newValue.role || change.newValue.designation}`,
      data: {
        roleHistory: change._id,
        extra: {
          userName: user.firstName,
          changedByName: `${changedBy.firstName} ${changedBy.lastName}`,
          previousRole: change.previousValue.role || change.previousValue.designation,
          newRole: change.newValue.role || change.newValue.designation,
          reason: change.reason,
          effectiveDate: change.effectiveDate?.toLocaleDateString(),
          handoverRequired: change.handover?.isRequired,
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
        }
      },
      link: '/profile',
      priority: 'high',
      channels: { inApp: true, email: true }
    });
  }

  async notifyHandoverRequired(fromUser, toUser, handoverTasks) {
    await this.create({
      recipient: toUser._id,
      sender: fromUser._id,
      type: 'handover_required',
      title: 'Handover Required',
      message: `${fromUser.firstName} ${fromUser.lastName} has initiated a handover to you`,
      data: {
        extra: {
          recipientName: toUser.firstName,
          fromUserName: `${fromUser.firstName} ${fromUser.lastName}`,
          tasks: handoverTasks,
          handoverUrl: `${process.env.FRONTEND_URL}/handover`
        }
      },
      link: '/handover',
      priority: 'urgent',
      channels: { inApp: true, email: true }
    });
  }

  async notifyDueDateApproaching(task, user) {
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const hoursUntilDue = Math.round((dueDate - now) / (1000 * 60 * 60));
    let dueSoon = hoursUntilDue <= 24 ? 'today' : hoursUntilDue <= 48 ? 'tomorrow' : `in ${Math.ceil(hoursUntilDue / 24)} days`;

    await this.create({
      recipient: user._id,
      type: 'task_due_soon',
      title: 'Task Due Soon',
      message: `"${task.title}" is due ${dueSoon}`,
      data: {
        workspace: task.workspace,
        task: task._id,
        extra: {
          userName: user.firstName,
          taskTitle: task.title,
          dueDate: dueDate.toLocaleDateString(),
          dueSoon,
          taskUrl: `${process.env.FRONTEND_URL}/tasks/${task._id}`
        }
      },
      link: `/tasks/${task._id}`,
      priority: hoursUntilDue <= 24 ? 'urgent' : 'high',
      channels: { inApp: true, email: true }
    });
  }

  async notifyNewMessage(message, channel, sender, recipients) {
    const recipientIds = recipients.filter(id => id.toString() !== sender._id.toString());
    if (recipientIds.length === 0) return;

    await this.createBulk(recipientIds, {
      sender: sender._id,
      type: 'team_message',
      title: `New message in ${channel.name}`,
      message: `${sender.firstName}: ${message.content.substring(0, 100)}`,
      data: {
        workspace: channel.workspace,
        channel: channel._id,
        extra: {
          channelName: channel.name,
          senderName: `${sender.firstName} ${sender.lastName}`,
          messageContent: message.content.substring(0, 200),
          channelUrl: `${process.env.FRONTEND_URL}/messages/${channel._id}`
        }
      },
      link: `/messages/${channel._id}`,
      channels: { inApp: true, email: false }
    });
  }

  async getUserNotifications(userId, options = {}) {
    return Notification.getUserNotifications(userId, options);
  }

  async markAsRead(notificationId, userId) {
    const notification = await Notification.markAsRead(notificationId, userId);
    socketService.emitToUser(userId, 'notification:read', { notificationId });
    return notification;
  }

  async markAllAsRead(userId, filter = {}) {
    await Notification.markAllAsRead(userId, filter);
    socketService.emitToUser(userId, 'notification:allRead', {});
  }

  async getUnreadCount(userId) {
    return Notification.getUnreadCount(userId);
  }

  async deleteNotification(notificationId, userId) {
    await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isArchived: true, archivedAt: new Date() }
    );
    socketService.emitToUser(userId, 'notification:deleted', { notificationId });
  }
}

const notificationService = new NotificationService();
export default notificationService;
