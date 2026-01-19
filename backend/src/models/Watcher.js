import mongoose from 'mongoose';

const watcherSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resourceType: {
    type: String,
    enum: ['Workspace', 'Space', 'Folder', 'List', 'Task'],
    required: true
  },
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  watchType: {
    type: String,
    enum: ['all', 'mentions', 'assignments', 'comments', 'status_changes'],
    default: 'all'
  },
  preferences: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isAutoAdded: { type: Boolean, default: false }
}, { timestamps: true });

watcherSchema.statics.addWatcher = async function(resourceType, resourceId, userId, workspaceId, options = {}) {
  const existing = await this.findOne({ resourceType, resourceId, user: userId });
  if (existing) return existing;

  return this.create({
    user: userId,
    resourceType,
    resourceId,
    workspace: workspaceId,
    watchType: options.watchType || 'all',
    preferences: options.preferences || {},
    addedBy: options.addedBy,
    isAutoAdded: options.isAutoAdded || false
  });
};

watcherSchema.statics.removeWatcher = function(resourceType, resourceId, userId) {
  return this.findOneAndDelete({ resourceType, resourceId, user: userId });
};

watcherSchema.statics.getWatchers = function(resourceType, resourceId) {
  return this.find({ resourceType, resourceId }).populate('user', 'firstName lastName email preferences');
};

watcherSchema.statics.isWatching = async function(resourceType, resourceId, userId) {
  const watcher = await this.findOne({ resourceType, resourceId, user: userId });
  return !!watcher;
};

watcherSchema.statics.getUserWatchedResources = function(userId, resourceType = null) {
  const query = { user: userId };
  if (resourceType) query.resourceType = resourceType;
  return this.find(query);
};

watcherSchema.index({ resourceType: 1, resourceId: 1 });
watcherSchema.index({ user: 1 });
watcherSchema.index({ workspace: 1 });
watcherSchema.index({ user: 1, resourceType: 1, resourceId: 1 }, { unique: true });

const Watcher = mongoose.model('Watcher', watcherSchema);
export default Watcher;
