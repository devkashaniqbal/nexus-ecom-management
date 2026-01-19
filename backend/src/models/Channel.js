import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Channel name is required'], trim: true, maxlength: [100, 'Channel name cannot exceed 100 characters'] },
  description: { type: String, maxlength: [500, 'Description cannot exceed 500 characters'] },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  type: { type: String, enum: ['public', 'private', 'direct', 'group'], default: 'public' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: { type: Date, default: Date.now },
    isMuted: { type: Boolean, default: false },
    mutedUntil: { type: Date }
  }],
  settings: {
    allowReactions: { type: Boolean, default: true },
    allowThreads: { type: Boolean, default: true },
    allowFiles: { type: Boolean, default: true },
    retentionDays: { type: Number, default: 0 }
  },
  pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  lastMessage: {
    content: { type: String },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentAt: { type: Date }
  },
  messageCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

channelSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

channelSchema.methods.getUnreadCount = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) return 0;
  return mongoose.model('Message').countDocuments({
    channel: this._id,
    createdAt: { $gt: member.lastReadAt },
    sender: { $ne: userId }
  });
};

channelSchema.statics.getOrCreateDirect = async function(workspaceId, userIds) {
  if (userIds.length !== 2) throw new Error('Direct channels require exactly 2 users');
  const sortedIds = userIds.sort();

  let channel = await this.findOne({
    workspace: workspaceId,
    type: 'direct',
    'members.user': { $all: sortedIds },
    $expr: { $eq: [{ $size: '$members' }, 2] }
  });

  if (!channel) {
    channel = await this.create({
      name: 'Direct Message',
      workspace: workspaceId,
      type: 'direct',
      members: sortedIds.map(id => ({ user: id })),
      createdBy: sortedIds[0]
    });
  }

  return channel;
};

channelSchema.virtual('messages', { ref: 'Message', localField: '_id', foreignField: 'channel' });

channelSchema.index({ workspace: 1 });
channelSchema.index({ team: 1 });
channelSchema.index({ 'members.user': 1 });
channelSchema.index({ type: 1 });
channelSchema.index({ isDeleted: 1, isArchived: 1 });

const Channel = mongoose.model('Channel', channelSchema);
export default Channel;
