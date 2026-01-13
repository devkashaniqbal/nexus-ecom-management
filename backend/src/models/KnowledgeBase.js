import mongoose from 'mongoose';

const knowledgeBaseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    category: {
      type: String,
      enum: ['project', 'documentation', 'policy', 'process', 'other'],
      default: 'other',
    },
    tags: [{
      type: String,
      trim: true,
    }],
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileUrl: {
      type: String,
    },
    fileName: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    embeddings: {
      type: [Number],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient searching
knowledgeBaseSchema.index({ title: 'text', content: 'text', tags: 'text' });
knowledgeBaseSchema.index({ category: 1, isActive: 1 });
knowledgeBaseSchema.index({ projectId: 1 });

const KnowledgeBase = mongoose.model('KnowledgeBase', knowledgeBaseSchema);

export default KnowledgeBase;
