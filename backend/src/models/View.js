import mongoose from 'mongoose';

const viewSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'View name is required'], trim: true, maxlength: [100, 'View name cannot exceed 100 characters'] },
  type: { type: String, enum: ['list', 'board', 'calendar', 'gantt', 'timeline', 'table', 'workload', 'mindmap', 'activity'], required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space' },
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  list: { type: mongoose.Schema.Types.ObjectId, ref: 'List' },
  scope: { type: String, enum: ['workspace', 'space', 'folder', 'list', 'everything'], required: true },
  isDefault: { type: Boolean, default: false },
  isPrivate: { type: Boolean, default: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    canEdit: { type: Boolean, default: false }
  }],
  filters: [{
    field: { type: String, required: true },
    operator: { type: String, enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty', 'in', 'not_in'], required: true },
    value: { type: mongoose.Schema.Types.Mixed }
  }],
  groupBy: { type: String, enum: ['none', 'status', 'priority', 'assignee', 'dueDate', 'list', 'space', 'tags', 'custom_field'] },
  sortBy: [{
    field: { type: String },
    order: { type: String, enum: ['asc', 'desc'], default: 'asc' }
  }],
  columns: [{
    field: { type: String, required: true },
    width: { type: Number },
    isVisible: { type: Boolean, default: true },
    order: { type: Number }
  }],
  settings: {
    showSubtasks: { type: Boolean, default: true },
    showClosedTasks: { type: Boolean, default: false },
    showEmptyGroups: { type: Boolean, default: true },
    collapsedGroups: [{ type: String }],
    colorBy: { type: String, enum: ['none', 'status', 'priority', 'assignee'] },
    cardFields: [{ type: String }],
    calendarSettings: {
      showWeekends: { type: Boolean, default: true },
      startOfWeek: { type: Number, default: 0 },
      defaultView: { type: String, enum: ['month', 'week', 'day'], default: 'month' }
    },
    ganttSettings: {
      showDependencies: { type: Boolean, default: true },
      showProgress: { type: Boolean, default: true },
      showToday: { type: Boolean, default: true }
    }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

viewSchema.index({ workspace: 1, scope: 1 });
viewSchema.index({ owner: 1 });
viewSchema.index({ 'sharedWith.user': 1 });
viewSchema.index({ isDeleted: 1 });

const View = mongoose.model('View', viewSchema);
export default View;
