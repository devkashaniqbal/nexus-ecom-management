import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Team name is required'], trim: true, maxlength: [100, 'Team name cannot exceed 100 characters'] },
  description: { type: String, maxlength: [500, 'Description cannot exceed 500 characters'] },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  avatar: { type: String },
  color: { type: String, default: '#3B82F6' },
  type: { type: String, enum: ['department', 'project', 'custom', 'cross_functional'], default: 'custom' },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['lead', 'member', 'viewer'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  settings: {
    isPrivate: { type: Boolean, default: false },
    allowMemberInvite: { type: Boolean, default: false },
    defaultChannel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' }
  },
  channels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
  }],
  linkedSpaces: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Space' }],
  linkedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

teamSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

teamSchema.methods.isLead = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member && member.role === 'lead';
};

teamSchema.methods.addMember = async function(userId, addedBy, role = 'member') {
  if (this.isMember(userId)) throw new Error('User is already a team member');
  this.members.push({ user: userId, role, addedBy, joinedAt: new Date() });
  return this.save();
};

teamSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(m => m.user.toString() !== userId.toString());
  return this.save();
};

teamSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

teamSchema.index({ workspace: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ lead: 1 });
teamSchema.index({ isDeleted: 1, isArchived: 1 });

const Team = mongoose.model('Team', teamSchema);
export default Team;
