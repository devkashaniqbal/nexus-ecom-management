import notificationService from '../services/notificationService.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

export const getNotifications = async (req, res) => {
  try {
    const { limit = 20, skip = 0, unreadOnly = false, type } = req.query;

    const notifications = await notificationService.getUserNotifications(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      unreadOnly: unreadOnly === 'true',
      type
    });

    const unreadCount = await notificationService.getUnreadCount(req.user._id);

    res.json({
      status: 'success',
      data: { notifications, unreadCount }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);
    res.json({ status: 'success', data: { count } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user._id);

    if (!notification) {
      return res.status(404).json({ status: 'error', message: 'Notification not found' });
    }

    res.json({ status: 'success', data: { notification } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const { type, workspaceId } = req.body;
    const filter = {};

    if (type) filter.type = type;
    if (workspaceId) filter['data.workspace'] = workspaceId;

    await notificationService.markAllAsRead(req.user._id, filter);

    res.json({ status: 'success', message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    await notificationService.deleteNotification(req.params.id, req.user._id);
    res.json({ status: 'success', message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const { notifications } = req.body;

    await User.findByIdAndUpdate(req.user._id, {
      'preferences.notifications': notifications
    });

    res.json({ status: 'success', message: 'Preferences updated' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('preferences.notifications');
    res.json({ status: 'success', data: { preferences: user.preferences?.notifications || {} } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
