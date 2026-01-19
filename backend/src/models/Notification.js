import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: [
      'task_assigned', 'task_unassigned', 'task_completed', 'task_status_changed', 'task_due_soon', 'task_overdue', 'task_priority_changed', 'task_updated',
      'comment_added', 'comment_reply', 'comment_mention', 'comment_reaction',
      'subtask_added', 'subtask_completed',
      'list_assigned', 'space_added', 'workspace_invited', 'workspace_role_changed',
      'role_changed', 'promoted', 'demoted', 'manager_changed', 'department_changed',
      'handover_required', 'handover_received', 'handover_completed',
      'team_added', 'team_removed', 'team_message',
      'approval_required', 'approval_granted', 'approval_rejected',
      'reminder', 'due_date_changed', 'sprint_started', 'sprint_ended',
      'file_uploaded', 'file_shared',
      'system', 'custom'
    ],
    required: true
  },
  title: { type: String, required: true, maxlength: 200 },
  message: { type: String, required: true, maxlength: 1000 },
  data: {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space' },
    list: { type: mongoose.Schema.Types.ObjectId, ref: 'List' },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    roleHistory: { type: mongoose.Schema.Types.ObjectId, ref: 'RoleHistory' },
    extra: { type: mongoose.Schema.Types.Mixed }
  },
  link: { type: String },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },
  status: {
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    isEmailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date },
    emailError: { type: String },
    isPushSent: { type: Boolean, default: false },
    pushSentAt: { type: Date }
  },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  expiresAt: { type: Date },
  groupId: { type: String },
  isGrouped: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  return notification;
};

notificationSchema.statics.createBulkNotifications = async function(recipients, baseData) {
  const notifications = recipients.map(recipientId => ({
    ...baseData,
    recipient: recipientId
  }));
  return this.insertMany(notifications);
};

notificationSchema.statics.markAsRead = function(notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { 'status.isRead': true, 'status.readAt': new Date() },
    { new: true }
  );
};

notificationSchema.statics.markAllAsRead = function(userId, filter = {}) {
  const query = { recipient: userId, 'status.isRead': false, ...filter };
  return this.updateMany(query, { 'status.isRead': true, 'status.readAt': new Date() });
};

notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ recipient: userId, 'status.isRead': false, isArchived: false });
};

notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const query = { recipient: userId, isArchived: false };
  if (options.unreadOnly) query['status.isRead'] = false;
  if (options.type) query.type = options.type;

  let dbQuery = this.find(query)
    .populate('sender', 'firstName lastName profileImage')
    .sort({ createdAt: -1 });

  if (options.limit) dbQuery = dbQuery.limit(options.limit);
  if (options.skip) dbQuery = dbQuery.skip(options.skip);

  return dbQuery;
};

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, 'status.isRead': 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ groupId: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
