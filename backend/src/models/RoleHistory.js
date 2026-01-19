import mongoose from 'mongoose';

const roleHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  changeType: {
    type: String,
    enum: ['role_change', 'promotion', 'demotion', 'manager_change', 'department_change', 'designation_change', 'permission_change', 'team_assignment', 'team_removal', 'workspace_role_change', 'space_role_change'],
    required: true
  },
  previousValue: {
    role: { type: String },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: String },
    designation: { type: String },
    permissions: { type: mongoose.Schema.Types.Mixed },
    workspaceRole: { type: String },
    spaceRole: { type: String },
    teamId: { type: mongoose.Schema.Types.ObjectId },
    teamName: { type: String }
  },
  newValue: {
    role: { type: String },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: String },
    designation: { type: String },
    permissions: { type: mongoose.Schema.Types.Mixed },
    workspaceRole: { type: String },
    spaceRole: { type: String },
    teamId: { type: mongoose.Schema.Types.ObjectId },
    teamName: { type: String }
  },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, maxlength: [500, 'Reason cannot exceed 500 characters'] },
  effectiveDate: { type: Date, default: Date.now },
  relatedResource: {
    type: { type: String, enum: ['Workspace', 'Space', 'Team', 'Project'] },
    id: { type: mongoose.Schema.Types.ObjectId }
  },
  handover: {
    isRequired: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'skipped'], default: 'pending' },
    handoverTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tasks: [{
      description: { type: String },
      isCompleted: { type: Boolean, default: false },
      completedAt: { type: Date }
    }],
    completedAt: { type: Date },
    notes: { type: String }
  },
  notifications: {
    notifiedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sentAt: { type: Date }
  },
  metadata: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String }
}, { timestamps: true });

roleHistorySchema.statics.logChange = async function(data) {
  const history = new this(data);
  await history.save();
  return history;
};

roleHistorySchema.statics.getUserHistory = function(userId, options = {}) {
  const query = { user: userId };
  if (options.changeType) query.changeType = options.changeType;
  if (options.startDate || options.endDate) {
    query.effectiveDate = {};
    if (options.startDate) query.effectiveDate.$gte = options.startDate;
    if (options.endDate) query.effectiveDate.$lte = options.endDate;
  }
  return this.find(query)
    .populate('changedBy', 'firstName lastName email')
    .populate('previousValue.manager', 'firstName lastName')
    .populate('newValue.manager', 'firstName lastName')
    .sort({ effectiveDate: -1 });
};

roleHistorySchema.index({ user: 1, effectiveDate: -1 });
roleHistorySchema.index({ changeType: 1 });
roleHistorySchema.index({ changedBy: 1 });
roleHistorySchema.index({ workspace: 1 });
roleHistorySchema.index({ 'handover.status': 1 });

const RoleHistory = mongoose.model('RoleHistory', roleHistorySchema);
export default RoleHistory;
