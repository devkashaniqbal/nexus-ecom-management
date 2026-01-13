import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['not_started', 'active', 'on_hold', 'shipped', 'cancelled'],
    default: 'not_started'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  estimatedHours: {
    type: Number,
    default: 0
  },
  projectValue: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  team: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['lead', 'developer', 'designer', 'qa', 'other']
    },
    hourlyRate: {
      type: Number
    }
  }],
  projectManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  technologies: [{
    type: String
  }],
  links: {
    repository: String,
    staging: String,
    production: String,
    documentation: String
  },
  budget: {
    allocated: Number,
    spent: Number
  },
  isActive: {
    type: Boolean,
    default: true
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

projectSchema.index({ code: 1 });
projectSchema.index({ client: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ isActive: 1 });

projectSchema.virtual('totalHoursLogged', {
  ref: 'Timesheet',
  localField: '_id',
  foreignField: 'project',
  count: true
});

const Project = mongoose.model('Project', projectSchema);

export default Project;
