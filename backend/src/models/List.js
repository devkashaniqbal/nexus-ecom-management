import mongoose from 'mongoose';

const listSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'List name is required'],
    trim: true,
    maxlength: [100, 'List name cannot exceed 100 characters']
  },
  space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  color: { type: String, default: '#3B82F6' },
  icon: { type: String, default: 'list' },
  order: { type: Number, default: 0 },
  orderInFolder: { type: Number, default: 0 },
  settings: {
    defaultView: { type: String, enum: ['list', 'board', 'calendar', 'gantt', 'timeline', 'table'], default: 'list' },
    statuses: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      color: { type: String, required: true },
      order: { type: Number, default: 0 },
      isDefault: { type: Boolean, default: false },
      isClosed: { type: Boolean, default: false }
    }],
    customFields: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      type: { type: String, enum: ['text', 'number', 'date', 'dropdown', 'checkbox', 'url', 'email', 'phone', 'currency', 'rating', 'progress', 'formula', 'relation', 'people', 'files', 'location'], required: true },
      options: [{ label: String, color: String, value: String }],
      isRequired: { type: Boolean, default: false },
      isVisible: { type: Boolean, default: true },
      order: { type: Number, default: 0 }
    }],
    inheritFromSpace: { type: Boolean, default: true },
    showClosed: { type: Boolean, default: false },
    showSubtasks: { type: Boolean, default: true },
    groupBy: { type: String, enum: ['status', 'priority', 'assignee', 'dueDate', 'none'], default: 'status' },
    sortBy: { type: String, default: 'order' },
    sortOrder: { type: String, enum: ['asc', 'desc'], default: 'asc' }
  },
  taskCount: { type: Number, default: 0 },
  completedTaskCount: { type: Number, default: 0 },
  dueDate: { type: Date },
  startDate: { type: Date },
  priority: { type: Number, min: 1, max: 4 },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

listSchema.pre('save', function(next) {
  if (this.isNew && (!this.settings.statuses || this.settings.statuses.length === 0)) {
    this.settings.statuses = [
      { id: 'todo', name: 'To Do', color: '#6B7280', order: 0, isDefault: true, isClosed: false },
      { id: 'in_progress', name: 'In Progress', color: '#3B82F6', order: 1, isDefault: false, isClosed: false },
      { id: 'review', name: 'In Review', color: '#F59E0B', order: 2, isDefault: false, isClosed: false },
      { id: 'done', name: 'Done', color: '#10B981', order: 3, isDefault: false, isClosed: true }
    ];
  }
  next();
});

listSchema.virtual('tasks', { ref: 'Task', localField: '_id', foreignField: 'list' });

listSchema.index({ space: 1, folder: 1, order: 1 });
listSchema.index({ workspace: 1 });
listSchema.index({ isDeleted: 1, isArchived: 1 });
listSchema.index({ dueDate: 1 });

const List = mongoose.model('List', listSchema);
export default List;
