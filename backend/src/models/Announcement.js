import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  type: {
    type: String,
    enum: ['general', 'holiday', 'policy', 'event', 'urgent', 'celebration'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  targetAudience: {
    roles: [{
      type: String,
      enum: ['admin', 'manager', 'employee']
    }],
    departments: [{
      type: String
    }],
    specificUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  attachments: [{
    url: String,
    s3Key: String,
    fileName: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  publishDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

announcementSchema.index({ publishDate: -1 });
announcementSchema.index({ type: 1 });
announcementSchema.index({ isActive: 1 });
announcementSchema.index({ isPinned: -1 });

announcementSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readBy.some(r => r.user.toString() === userId.toString());
  if (!alreadyRead) {
    this.readBy.push({ user: userId, readAt: new Date() });
    return this.save();
  }
  return Promise.resolve(this);
};

const Announcement = mongoose.model('Announcement', announcementSchema);

export default Announcement;
