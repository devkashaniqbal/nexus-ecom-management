import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Tag name is required'], trim: true, maxlength: [50, 'Tag name cannot exceed 50 characters'] },
  color: { type: String, default: '#6B7280' },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space' },
  usageCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

tagSchema.statics.getOrCreate = async function(name, workspaceId, spaceId = null, userId) {
  const query = { name: name.toLowerCase().trim(), workspace: workspaceId };
  if (spaceId) query.space = spaceId;

  let tag = await this.findOne(query);
  if (!tag) {
    tag = await this.create({
      name: name.toLowerCase().trim(),
      workspace: workspaceId,
      space: spaceId,
      createdBy: userId
    });
  }
  return tag;
};

tagSchema.statics.incrementUsage = function(tagId) {
  return this.findByIdAndUpdate(tagId, { $inc: { usageCount: 1 } });
};

tagSchema.statics.decrementUsage = function(tagId) {
  return this.findByIdAndUpdate(tagId, { $inc: { usageCount: -1 } });
};

tagSchema.index({ workspace: 1, name: 1 });
tagSchema.index({ space: 1, name: 1 });
tagSchema.index({ usageCount: -1 });

const Tag = mongoose.model('Tag', tagSchema);
export default Tag;
