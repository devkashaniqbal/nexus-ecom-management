import mongoose from 'mongoose';

const spaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Space name is required'],
    trim: true,
    maxlength: [100, 'Space name cannot exceed 100 characters']
  },
  description: { type: String, maxlength: [500, 'Description cannot exceed 500 characters'] },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  color: { type: String, default: '#3B82F6' },
  icon: { type: String, default: 'folder' },
  order: { type: Number, default: 0 },
  isPrivate: { type: Boolean, default: false },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
    permissions: {
      canCreateFolders: { type: Boolean, default: true },
      canCreateLists: { type: Boolean, default: true },
      canCreateTasks: { type: Boolean, default: true },
      canEditTasks: { type: Boolean, default: true },
      canDeleteTasks: { type: Boolean, default: false },
      canManageMembers: { type: Boolean, default: false }
    },
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  settings: {
    defaultView: { type: String, enum: ['list', 'board', 'calendar', 'gantt', 'timeline', 'table'], default: 'list' },
    statuses: [{
      name: { type: String, required: true },
      color: { type: String, required: true },
      order: { type: Number, default: 0 },
      isDefault: { type: Boolean, default: false },
      isClosed: { type: Boolean, default: false }
    }],
    customFields: [{
      name: { type: String, required: true },
      type: { type: String, enum: ['text', 'number', 'date', 'dropdown', 'checkbox', 'url', 'email', 'phone', 'currency', 'rating', 'progress', 'formula', 'relation', 'people', 'files', 'location'], required: true },
      options: [{ label: String, color: String, value: String }],
      isRequired: { type: Boolean, default: false },
      isVisible: { type: Boolean, default: true },
      order: { type: Number, default: 0 }
    }],
    automations: [{
      name: String,
      trigger: { type: { type: String }, conditions: mongoose.Schema.Types.Mixed },
      actions: [{ type: { type: String }, config: mongoose.Schema.Types.Mixed }],
      isActive: { type: Boolean, default: true }
    }]
  },
  features: {
    timeEstimates: { type: Boolean, default: true },
    timeTracking: { type: Boolean, default: true },
    tags: { type: Boolean, default: true },
    customFields: { type: Boolean, default: true },
    multipleAssignees: { type: Boolean, default: true },
    priorities: { type: Boolean, default: true },
    sprints: { type: Boolean, default: false },
    points: { type: Boolean, default: false }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

spaceSchema.pre('save', function(next) {
  if (this.isNew && (!this.settings.statuses || this.settings.statuses.length === 0)) {
    this.settings.statuses = [
      { name: 'To Do', color: '#6B7280', order: 0, isDefault: true, isClosed: false },
      { name: 'In Progress', color: '#3B82F6', order: 1, isDefault: false, isClosed: false },
      { name: 'Done', color: '#10B981', order: 2, isDefault: false, isClosed: true }
    ];
  }
  next();
});

spaceSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

spaceSchema.methods.hasPermission = function(userId, permission) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) return false;
  if (member.role === 'admin') return true;
  return member.permissions[permission] === true;
};

spaceSchema.virtual('folders', { ref: 'Folder', localField: '_id', foreignField: 'space' });
spaceSchema.virtual('lists', { ref: 'List', localField: '_id', foreignField: 'space', match: { folder: null } });

spaceSchema.index({ workspace: 1, order: 1 });
spaceSchema.index({ 'members.user': 1 });
spaceSchema.index({ isDeleted: 1, isArchived: 1 });

const Space = mongoose.model('Space', spaceSchema);
export default Space;
