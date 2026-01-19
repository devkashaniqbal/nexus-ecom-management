import mongoose from 'mongoose';

const sprintSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Sprint name is required'], trim: true, maxlength: [100, 'Sprint name cannot exceed 100 characters'] },
  goal: { type: String, maxlength: [500, 'Goal cannot exceed 500 characters'] },
  space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['planning', 'active', 'completed', 'cancelled'], default: 'planning' },
  capacity: {
    totalPoints: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 }
  },
  metrics: {
    plannedPoints: { type: Number, default: 0 },
    completedPoints: { type: Number, default: 0 },
    plannedTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    addedAfterStart: { type: Number, default: 0 },
    removedAfterStart: { type: Number, default: 0 }
  },
  burndown: [{
    date: { type: Date },
    remainingPoints: { type: Number },
    remainingTasks: { type: Number },
    idealRemaining: { type: Number }
  }],
  retrospective: {
    whatWentWell: [{ type: String }],
    whatCouldImprove: [{ type: String }],
    actionItems: [{
      text: { type: String },
      assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      isCompleted: { type: Boolean, default: false }
    }]
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

sprintSchema.virtual('tasks', { ref: 'Task', localField: '_id', foreignField: 'sprint' });

sprintSchema.methods.calculateMetrics = async function() {
  const Task = mongoose.model('Task');
  const tasks = await Task.find({ sprint: this._id, isDeleted: false });

  this.metrics.plannedTasks = tasks.length;
  this.metrics.completedTasks = tasks.filter(t => t.status.isClosed).length;
  this.metrics.plannedPoints = tasks.reduce((sum, t) => sum + (t.points || 0), 0);
  this.metrics.completedPoints = tasks.filter(t => t.status.isClosed).reduce((sum, t) => sum + (t.points || 0), 0);

  return this.save();
};

sprintSchema.index({ space: 1, status: 1 });
sprintSchema.index({ workspace: 1 });
sprintSchema.index({ startDate: 1, endDate: 1 });
sprintSchema.index({ isDeleted: 1 });

const Sprint = mongoose.model('Sprint', sprintSchema);
export default Sprint;
