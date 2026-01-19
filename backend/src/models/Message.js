import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  content: { type: String, maxlength: [10000, 'Message cannot exceed 10000 characters'] },
  contentHtml: { type: String },
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'file', 'image', 'video', 'audio', 'system', 'task_link', 'code', 'poll'], default: 'text' },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  threadCount: { type: Number, default: 0 },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  attachments: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String },
    size: { type: Number },
    thumbnailUrl: { type: String }
  }],
  reactions: [{
    emoji: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    count: { type: Number, default: 0 }
  }],
  linkedTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  poll: {
    question: { type: String },
    options: [{
      id: { type: String },
      text: { type: String },
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }],
    allowMultiple: { type: Boolean, default: false },
    isAnonymous: { type: Boolean, default: false },
    endsAt: { type: Date }
  },
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date },
  editHistory: [{
    content: { type: String },
    editedAt: { type: Date, default: Date.now }
  }],
  isPinned: { type: Boolean, default: false },
  pinnedAt: { type: Date },
  pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

messageSchema.post('save', async function() {
  if (!this.parent) {
    await mongoose.model('Channel').findByIdAndUpdate(this.channel, {
      lastMessage: { content: this.content?.substring(0, 100), sender: this.sender, sentAt: this.createdAt },
      $inc: { messageCount: 1 }
    });
  } else {
    await mongoose.model('Message').findByIdAndUpdate(this.parent, { $inc: { threadCount: 1 } });
  }
});

messageSchema.methods.addReaction = async function(emoji, userId) {
  const reactionIndex = this.reactions.findIndex(r => r.emoji === emoji);
  if (reactionIndex > -1) {
    if (!this.reactions[reactionIndex].users.includes(userId)) {
      this.reactions[reactionIndex].users.push(userId);
      this.reactions[reactionIndex].count++;
    }
  } else {
    this.reactions.push({ emoji, users: [userId], count: 1 });
  }
  return this.save();
};

messageSchema.methods.removeReaction = async function(emoji, userId) {
  const reactionIndex = this.reactions.findIndex(r => r.emoji === emoji);
  if (reactionIndex > -1) {
    this.reactions[reactionIndex].users = this.reactions[reactionIndex].users.filter(
      u => u.toString() !== userId.toString()
    );
    this.reactions[reactionIndex].count--;
    if (this.reactions[reactionIndex].count === 0) {
      this.reactions.splice(reactionIndex, 1);
    }
  }
  return this.save();
};

messageSchema.virtual('replies', { ref: 'Message', localField: '_id', foreignField: 'parent' });

messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ parent: 1 });
messageSchema.index({ mentions: 1 });
messageSchema.index({ isDeleted: 1 });
messageSchema.index({ '$**': 'text' });

const Message = mongoose.model('Message', messageSchema);
export default Message;
