import mongoose from 'mongoose';

const screenshotSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    required: true
  },
  captureTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  s3Key: {
    type: String,
    required: true
  },
  s3Bucket: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number
  },
  isBlurred: {
    type: Boolean,
    default: true
  },
  isCompressed: {
    type: Boolean,
    default: true
  },
  metadata: {
    appTitle: String,
    screenResolution: String,
    deviceInfo: String
  },
  retentionDate: {
    type: Date,
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

screenshotSchema.index({ user: 1, captureTime: -1 });
screenshotSchema.index({ attendance: 1 });
screenshotSchema.index({ retentionDate: 1 });
screenshotSchema.index({ isDeleted: 1 });

screenshotSchema.pre('save', function(next) {
  if (!this.retentionDate) {
    const retentionDays = parseInt(process.env.SCREENSHOT_RETENTION_DAYS) || 30;
    this.retentionDate = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
  }
  next();
});

screenshotSchema.methods.markAsDeleted = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

const Screenshot = mongoose.model('Screenshot', screenshotSchema);

export default Screenshot;
