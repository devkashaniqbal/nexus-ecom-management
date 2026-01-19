import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Workspace name is required'],
    trim: true,
    maxlength: [100, 'Workspace name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  logo: { type: String },
  color: { type: String, default: '#7C3AED' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'member', 'guest'], default: 'member' },
    permissions: {
      canCreateSpaces: { type: Boolean, default: false },
      canManageMembers: { type: Boolean, default: false },
      canDeleteWorkspace: { type: Boolean, default: false },
      canManageSettings: { type: Boolean, default: false },
      canViewAllSpaces: { type: Boolean, default: true },
      canExportData: { type: Boolean, default: false }
    },
    joinedAt: { type: Date, default: Date.now },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  settings: {
    defaultTaskView: { type: String, enum: ['list', 'board', 'calendar', 'gantt', 'timeline', 'table'], default: 'list' },
    taskStatuses: [{
      name: { type: String, required: true },
      color: { type: String, required: true },
      order: { type: Number, default: 0 },
      isDefault: { type: Boolean, default: false },
      isClosed: { type: Boolean, default: false }
    }],
    taskPriorities: [{
      name: { type: String, required: true },
      color: { type: String, required: true },
      level: { type: Number, required: true }
    }],
    features: {
      timeTracking: { type: Boolean, default: true },
      goals: { type: Boolean, default: true },
      docs: { type: Boolean, default: true },
      sprints: { type: Boolean, default: true },
      customFields: { type: Boolean, default: true }
    },
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
    workingHours: { start: { type: String, default: '09:00' }, end: { type: String, default: '18:00' } },
    timezone: { type: String, default: 'UTC' }
  },
  plan: { type: String, enum: ['free', 'starter', 'business', 'enterprise'], default: 'free' },
  usage: {
    membersCount: { type: Number, default: 0 },
    spacesCount: { type: Number, default: 0 },
    tasksCount: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 }
  },
  inviteLinks: [{
    code: { type: String, required: true },
    role: { type: String, enum: ['member', 'guest'], default: 'member' },
    expiresAt: { type: Date },
    usageLimit: { type: Number },
    usageCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }
  }],
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

workspaceSchema.pre('save', function(next) {
  if (this.isNew && (!this.settings.taskStatuses || this.settings.taskStatuses.length === 0)) {
    this.settings.taskStatuses = [
      { name: 'To Do', color: '#6B7280', order: 0, isDefault: true, isClosed: false },
      { name: 'In Progress', color: '#3B82F6', order: 1, isDefault: false, isClosed: false },
      { name: 'In Review', color: '#F59E0B', order: 2, isDefault: false, isClosed: false },
      { name: 'Done', color: '#10B981', order: 3, isDefault: false, isClosed: true },
      { name: 'Closed', color: '#6B7280', order: 4, isDefault: false, isClosed: true }
    ];
  }
  if (this.isNew && (!this.settings.taskPriorities || this.settings.taskPriorities.length === 0)) {
    this.settings.taskPriorities = [
      { name: 'Urgent', color: '#EF4444', level: 4 },
      { name: 'High', color: '#F97316', level: 3 },
      { name: 'Normal', color: '#3B82F6', level: 2 },
      { name: 'Low', color: '#6B7280', level: 1 }
    ];
  }
  next();
});

workspaceSchema.pre('validate', function(next) {
  if (this.isNew && !this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  }
  next();
});

workspaceSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

workspaceSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

workspaceSchema.methods.hasPermission = function(userId, permission) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) return false;
  if (member.role === 'owner' || member.role === 'admin') return true;
  return member.permissions[permission] === true;
};

workspaceSchema.virtual('spaces', { ref: 'Space', localField: '_id', foreignField: 'workspace' });

workspaceSchema.index({ slug: 1 });
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.user': 1 });
workspaceSchema.index({ isActive: 1, isDeleted: 1 });

const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;
