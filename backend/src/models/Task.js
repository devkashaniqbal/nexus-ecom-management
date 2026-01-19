import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [500, 'Task title cannot exceed 500 characters']
  },
  description: { type: String, maxlength: [50000, 'Description cannot exceed 50000 characters'] },
  descriptionHtml: { type: String },
  taskId: { type: String, required: true, unique: true },
  list: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true },
  space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  order: { type: Number, default: 0 },
  orderInStatus: { type: Number, default: 0 },
  status: {
    id: { type: String, required: true, default: 'todo' },
    name: { type: String, required: true, default: 'To Do' },
    color: { type: String, default: '#6B7280' }
  },
  priority: {
    level: { type: Number, min: 1, max: 4, default: 2 },
    name: { type: String, default: 'Normal' },
    color: { type: String, default: '#3B82F6' }
  },
  assignees: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date, default: Date.now },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: { type: Date },
  startDate: { type: Date },
  timeEstimate: { type: Number, default: 0 },
  timeSpent: { type: Number, default: 0 },
  points: { type: Number },
  tags: [{
    name: { type: String, required: true },
    color: { type: String, default: '#6B7280' }
  }],
  customFields: [{
    fieldId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    value: mongoose.Schema.Types.Mixed
  }],
  checklists: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    order: { type: Number, default: 0 },
    items: [{
      id: { type: String, required: true },
      text: { type: String, required: true },
      isCompleted: { type: Boolean, default: false },
      completedAt: { type: Date },
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      dueDate: { type: Date },
      order: { type: Number, default: 0 }
    }]
  }],
  attachments: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String },
    size: { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  dependencies: [{
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    type: { type: String, enum: ['waiting_on', 'blocking'], required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  linkedTasks: [{
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    type: { type: String, enum: ['related', 'duplicate', 'parent', 'child'], default: 'related' }
  }],
  sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
  milestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone' },
  recurring: {
    isRecurring: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'] },
    interval: { type: Number, default: 1 },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    endDate: { type: Date },
    nextDueDate: { type: Date }
  },
  timeTracking: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startTime: { type: Date },
    endTime: { type: Date },
    duration: { type: Number },
    description: { type: String },
    isBillable: { type: Boolean, default: true }
  }],
  completedAt: { type: Date },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

taskSchema.pre('validate', async function(next) {
  if (this.isNew && !this.taskId) {
    const count = await mongoose.model('Task').countDocuments({ workspace: this.workspace });
    this.taskId = `TASK-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

taskSchema.virtual('subtasks', { ref: 'Task', localField: '_id', foreignField: 'parent' });
taskSchema.virtual('comments', { ref: 'Comment', localField: '_id', foreignField: 'task' });
taskSchema.virtual('subtaskCount', { ref: 'Task', localField: '_id', foreignField: 'parent', count: true });
taskSchema.virtual('completedSubtaskCount').get(function() {
  return 0;
});

taskSchema.methods.isAssignee = function(userId) {
  return this.assignees.some(a => a.user.toString() === userId.toString());
};

taskSchema.methods.isWatcher = function(userId) {
  return this.watchers.some(w => w.toString() === userId.toString());
};

taskSchema.index({ workspace: 1, taskId: 1 });
taskSchema.index({ list: 1, order: 1 });
taskSchema.index({ space: 1 });
taskSchema.index({ 'assignees.user': 1 });
taskSchema.index({ 'status.id': 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ parent: 1 });
taskSchema.index({ isDeleted: 1, isArchived: 1 });
taskSchema.index({ creator: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ sprint: 1 });
taskSchema.index({ '$**': 'text' });

const Task = mongoose.model('Task', taskSchema);
export default Task;
