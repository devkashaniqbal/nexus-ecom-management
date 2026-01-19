import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true,
    maxlength: [100, 'Folder name cannot exceed 100 characters']
  },
  space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  color: { type: String, default: '#6B7280' },
  icon: { type: String, default: 'folder' },
  order: { type: Number, default: 0 },
  isHidden: { type: Boolean, default: false },
  settings: {
    defaultView: { type: String, enum: ['list', 'board', 'calendar', 'gantt', 'timeline', 'table'], default: 'list' },
    statuses: [{
      name: { type: String, required: true },
      color: { type: String, required: true },
      order: { type: Number, default: 0 },
      isDefault: { type: Boolean, default: false },
      isClosed: { type: Boolean, default: false }
    }],
    inheritFromSpace: { type: Boolean, default: true }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

folderSchema.virtual('lists', { ref: 'List', localField: '_id', foreignField: 'folder' });

folderSchema.index({ space: 1, order: 1 });
folderSchema.index({ workspace: 1 });
folderSchema.index({ isDeleted: 1, isArchived: 1 });

const Folder = mongoose.model('Folder', folderSchema);
export default Folder;
