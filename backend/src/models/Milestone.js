import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Milestone name is required'], trim: true, maxlength: [100, 'Milestone name cannot exceed 100 characters'] },
  description: { type: String, maxlength: [1000, 'Description cannot exceed 1000 characters'] },
  space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  dueDate: { type: Date },
  startDate: { type: Date },
  status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'missed'], default: 'not_started' },
  color: { type: String, default: '#8B5CF6' },
  icon: { type: String, default: 'flag' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  metrics: {
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    completedPoints: { type: Number, default: 0 }
  },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completedAt: { type: Date },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

milestoneSchema.virtual('tasks', { ref: 'Task', localField: '_id', foreignField: 'milestone' });

milestoneSchema.methods.calculateProgress = async function() {
  const Task = mongoose.model('Task');
  const tasks = await Task.find({ milestone: this._id, isDeleted: false });

  this.metrics.totalTasks = tasks.length;
  this.metrics.completedTasks = tasks.filter(t => t.status.isClosed).length;
  this.metrics.totalPoints = tasks.reduce((sum, t) => sum + (t.points || 0), 0);
  this.metrics.completedPoints = tasks.filter(t => t.status.isClosed).reduce((sum, t) => sum + (t.points || 0), 0);

  if (this.metrics.totalTasks > 0) {
    this.progress = Math.round((this.metrics.completedTasks / this.metrics.totalTasks) * 100);
  }

  if (this.progress === 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = new Date();
  }

  return this.save();
};

milestoneSchema.index({ space: 1, status: 1 });
milestoneSchema.index({ workspace: 1 });
milestoneSchema.index({ dueDate: 1 });
milestoneSchema.index({ isDeleted: 1 });

const Milestone = mongoose.model('Milestone', milestoneSchema);
export default Milestone;
