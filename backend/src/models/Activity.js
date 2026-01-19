import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: [
      'created', 'updated', 'deleted', 'archived', 'restored', 'moved', 'copied',
      'status_changed', 'priority_changed', 'due_date_changed', 'assignee_added', 'assignee_removed',
      'comment_added', 'comment_edited', 'comment_deleted', 'comment_resolved',
      'attachment_added', 'attachment_removed',
      'checklist_added', 'checklist_item_completed', 'checklist_item_uncompleted',
      'tag_added', 'tag_removed',
      'time_tracked', 'estimate_changed',
      'dependency_added', 'dependency_removed',
      'subtask_added', 'subtask_completed',
      'custom_field_changed',
      'member_added', 'member_removed', 'member_role_changed',
      'settings_updated', 'permissions_changed'
    ],
    required: true
  },
  resourceType: {
    type: String,
    enum: ['Workspace', 'Space', 'Folder', 'List', 'Task', 'Comment', 'Team', 'Channel', 'User'],
    required: true
  },
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  resourceName: { type: String },
  parentResource: {
    type: { type: String, enum: ['Workspace', 'Space', 'Folder', 'List', 'Task'] },
    id: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String }
  },
  changes: {
    field: { type: String },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed }
  },
  metadata: { type: mongoose.Schema.Types.Mixed },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isSystem: { type: Boolean, default: false }
}, { timestamps: true });

activitySchema.statics.log = async function(data) {
  const activity = new this(data);
  await activity.save();
  return activity;
};

activitySchema.statics.getForResource = function(resourceType, resourceId, options = {}) {
  const query = { resourceType, resourceId };
  let dbQuery = this.find(query)
    .populate('user', 'firstName lastName profileImage')
    .sort({ createdAt: -1 });
  if (options.limit) dbQuery = dbQuery.limit(options.limit);
  if (options.skip) dbQuery = dbQuery.skip(options.skip);
  return dbQuery;
};

activitySchema.statics.getForWorkspace = function(workspaceId, options = {}) {
  const query = { workspace: workspaceId };
  if (options.resourceType) query.resourceType = options.resourceType;
  if (options.userId) query.user = options.userId;
  if (options.action) query.action = options.action;

  let dbQuery = this.find(query)
    .populate('user', 'firstName lastName profileImage')
    .sort({ createdAt: -1 });
  if (options.limit) dbQuery = dbQuery.limit(options.limit);
  if (options.skip) dbQuery = dbQuery.skip(options.skip);
  return dbQuery;
};

activitySchema.index({ workspace: 1, createdAt: -1 });
activitySchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ action: 1 });

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
