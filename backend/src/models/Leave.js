import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leaveType: {
    type: String,
    required: true,
    enum: ['sick', 'casual', 'vacation', 'personal', 'unpaid', 'bereavement', 'maternity', 'paternity']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalDays: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: [true, 'Reason is required']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
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
  handoverTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  handoverNotes: {
    type: String
  },
  emergencyContact: {
    name: String,
    phone: String
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

leaveSchema.index({ user: 1, startDate: -1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });

leaveSchema.pre('save', function(next) {
  if (this.isModified('startDate') || this.isModified('endDate')) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end - start);
    this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  next();
});

const Leave = mongoose.model('Leave', leaveSchema);

export default Leave;
