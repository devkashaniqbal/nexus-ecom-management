import mongoose from 'mongoose';

const timesheetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  weekStartDate: {
    type: Date,
    required: true
  },
  weekEndDate: {
    type: Date,
    required: true
  },
  entries: [{
    date: {
      type: Date,
      required: true
    },
    hours: {
      type: Number,
      required: true,
      min: 0,
      max: 24
    },
    description: {
      type: String,
      required: true
    },
    taskType: {
      type: String,
      enum: ['development', 'design', 'testing', 'meeting', 'documentation', 'bug_fix', 'other'],
      default: 'development'
    }
  }],
  totalHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'draft'
  },
  submittedAt: {
    type: Date
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
  notes: {
    type: String
  }
}, {
  timestamps: true
});

timesheetSchema.index({ user: 1, weekStartDate: -1 });
timesheetSchema.index({ project: 1 });
timesheetSchema.index({ status: 1 });
timesheetSchema.index({ weekStartDate: -1 });

timesheetSchema.pre('save', function(next) {
  this.totalHours = this.entries.reduce((sum, entry) => sum + entry.hours, 0);
  next();
});

const Timesheet = mongoose.model('Timesheet', timesheetSchema);

export default Timesheet;
