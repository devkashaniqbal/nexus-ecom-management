import mongoose from 'mongoose';

const breakSchema = new mongoose.Schema({
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number
  },
  type: {
    type: String,
    enum: ['break', 'short_leave'],
    default: 'break'
  },
  reason: {
    type: String
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: true });

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  },
  checkIn: {
    time: {
      type: Date,
      required: true
    },
    ip: {
      type: String
    },
    location: {
      type: String
    }
  },
  checkOut: {
    time: {
      type: Date
    },
    ip: {
      type: String
    },
    location: {
      type: String
    }
  },
  breaks: [breakSchema],
  status: {
    type: String,
    enum: ['working', 'break', 'short_leave', 'checked_out', 'offline'],
    default: 'working'
  },
  totalWorkHours: {
    type: Number,
    default: 0
  },
  totalBreakHours: {
    type: Number,
    default: 0
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateBy: {
    type: Number,
    default: 0
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

attendanceSchema.index({ user: 1, date: -1 });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ status: 1 });

attendanceSchema.methods.calculateWorkHours = function() {
  if (!this.checkIn.time) return 0;

  const endTime = this.checkOut.time || new Date();
  let totalWorkMs = endTime - this.checkIn.time;

  this.breaks.forEach(breakItem => {
    if (breakItem.startTime && breakItem.endTime) {
      const breakDuration = breakItem.endTime - breakItem.startTime;
      totalWorkMs -= breakDuration;
    }
  });

  return Math.max(0, totalWorkMs / (1000 * 60 * 60));
};

attendanceSchema.methods.calculateBreakHours = function() {
  let totalBreakMs = 0;

  this.breaks.forEach(breakItem => {
    if (breakItem.startTime && breakItem.endTime) {
      totalBreakMs += (breakItem.endTime - breakItem.startTime);
    }
  });

  return totalBreakMs / (1000 * 60 * 60);
};

attendanceSchema.pre('save', function(next) {
  this.totalWorkHours = this.calculateWorkHours();
  this.totalBreakHours = this.calculateBreakHours();
  next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
