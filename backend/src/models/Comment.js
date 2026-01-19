import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  content: { type: String, required: [true, 'Comment content is required'], maxlength: [10000, 'Comment cannot exceed 10000 characters'] },
  contentHtml: { type: String },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  list: { type: mongoose.Schema.Types.ObjectId, ref: 'List' },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  attachments: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String },
    size: { type: Number }
  }],
  reactions: [{
    emoji: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date },
  editHistory: [{
    content: { type: String },
    editedAt: { type: Date, default: Date.now }
  }],
  isPinned: { type: Boolean, default: false },
  isResolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

commentSchema.virtual('replies', { ref: 'Comment', localField: '_id', foreignField: 'parent' });
commentSchema.virtual('replyCount', { ref: 'Comment', localField: '_id', foreignField: 'parent', count: true });

commentSchema.index({ task: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parent: 1 });
commentSchema.index({ mentions: 1 });
commentSchema.index({ isDeleted: 1 });

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
