import cron from 'node-cron';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import notificationService from '../services/notificationService.js';
import logger from '../utils/logger.js';

class NotificationJobs {
  start() {
    // Check for tasks due soon - runs every hour
    cron.schedule('0 * * * *', async () => {
      await this.checkDueDateReminders();
    });

    // Check for overdue tasks - runs daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
      await this.checkOverdueTasks();
    });

    // Clean up old notifications - runs daily at midnight
    cron.schedule('0 0 * * *', async () => {
      await this.cleanupOldNotifications();
    });

    // Send daily digest - runs daily at 8 AM
    cron.schedule('0 8 * * 1-5', async () => {
      await this.sendDailyDigest();
    });

    logger.info('Notification jobs scheduled');
  }

  async checkDueDateReminders() {
    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Tasks due in next 24 hours
      const tasksDue24 = await Task.find({
        dueDate: { $gte: now, $lte: in24Hours },
        'status.isClosed': { $ne: true },
        isDeleted: false
      }).populate('assignees.user', 'firstName lastName email preferences');

      for (const task of tasksDue24) {
        for (const assignee of task.assignees) {
          if (assignee.user && assignee.user.preferences?.notifications?.dueDateReminders !== false) {
            // Check if reminder already sent
            const existingReminder = await Notification.findOne({
              recipient: assignee.user._id,
              type: 'task_due_soon',
              'data.task': task._id,
              createdAt: { $gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) }
            });

            if (!existingReminder) {
              await notificationService.notifyDueDateApproaching(task, assignee.user);
            }
          }
        }
      }

      // Tasks due in 24-48 hours (single reminder)
      const tasksDue48 = await Task.find({
        dueDate: { $gt: in24Hours, $lte: in48Hours },
        'status.isClosed': { $ne: true },
        isDeleted: false
      }).populate('assignees.user', 'firstName lastName email preferences');

      for (const task of tasksDue48) {
        for (const assignee of task.assignees) {
          if (assignee.user && assignee.user.preferences?.notifications?.dueDateReminders !== false) {
            const existingReminder = await Notification.findOne({
              recipient: assignee.user._id,
              type: 'task_due_soon',
              'data.task': task._id,
              createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
            });

            if (!existingReminder) {
              await notificationService.notifyDueDateApproaching(task, assignee.user);
            }
          }
        }
      }

      logger.info(`Due date reminders processed: ${tasksDue24.length + tasksDue48.length} tasks`);
    } catch (error) {
      logger.error('Error checking due date reminders:', error);
    }
  }

  async checkOverdueTasks() {
    try {
      const now = new Date();

      const overdueTasks = await Task.find({
        dueDate: { $lt: now },
        'status.isClosed': { $ne: true },
        isDeleted: false
      }).populate('assignees.user', 'firstName lastName email');

      for (const task of overdueTasks) {
        for (const assignee of task.assignees) {
          if (assignee.user) {
            // Check if overdue notification already sent today
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const existingNotification = await Notification.findOne({
              recipient: assignee.user._id,
              type: 'task_overdue',
              'data.task': task._id,
              createdAt: { $gte: today }
            });

            if (!existingNotification) {
              await notificationService.create({
                recipient: assignee.user._id,
                type: 'task_overdue',
                title: 'Task Overdue',
                message: `"${task.title}" is past its due date`,
                data: {
                  workspace: task.workspace,
                  task: task._id,
                  extra: {
                    taskTitle: task.title,
                    dueDate: task.dueDate.toLocaleDateString()
                  }
                },
                priority: 'urgent',
                channels: { inApp: true, email: true }
              });
            }
          }
        }
      }

      logger.info(`Overdue task notifications processed: ${overdueTasks.length} tasks`);
    } catch (error) {
      logger.error('Error checking overdue tasks:', error);
    }
  }

  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Archive old read notifications
      const result = await Notification.updateMany(
        {
          'status.isRead': true,
          createdAt: { $lt: thirtyDaysAgo },
          isArchived: false
        },
        {
          isArchived: true,
          archivedAt: new Date()
        }
      );

      // Delete very old archived notifications (90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const deleted = await Notification.deleteMany({
        isArchived: true,
        archivedAt: { $lt: ninetyDaysAgo }
      });

      logger.info(`Notification cleanup: ${result.modifiedCount} archived, ${deleted.deletedCount} deleted`);
    } catch (error) {
      logger.error('Error cleaning up notifications:', error);
    }
  }

  async sendDailyDigest() {
    try {
      const users = await User.find({
        isActive: true,
        'preferences.notifications.dailyDigest': true
      });

      for (const user of users) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get tasks due today
        const tasksDueToday = await Task.find({
          'assignees.user': user._id,
          dueDate: { $gte: today, $lt: tomorrow },
          'status.isClosed': { $ne: true },
          isDeleted: false
        }).select('title dueDate status priority');

        // Get unread notifications count
        const unreadCount = await Notification.countDocuments({
          recipient: user._id,
          'status.isRead': false,
          isArchived: false
        });

        // Get overdue tasks count
        const overdueCount = await Task.countDocuments({
          'assignees.user': user._id,
          dueDate: { $lt: today },
          'status.isClosed': { $ne: true },
          isDeleted: false
        });

        if (tasksDueToday.length > 0 || unreadCount > 0 || overdueCount > 0) {
          await notificationService.create({
            recipient: user._id,
            type: 'reminder',
            title: 'Daily Digest',
            message: `You have ${tasksDueToday.length} tasks due today, ${overdueCount} overdue, and ${unreadCount} unread notifications`,
            data: {
              extra: {
                tasksDueToday: tasksDueToday.length,
                overdueCount,
                unreadNotifications: unreadCount,
                tasks: tasksDueToday.slice(0, 5)
              }
            },
            priority: 'normal',
            channels: { inApp: true, email: true }
          });
        }
      }

      logger.info(`Daily digest sent to ${users.length} users`);
    } catch (error) {
      logger.error('Error sending daily digest:', error);
    }
  }
}

const notificationJobs = new NotificationJobs();
export default notificationJobs;
