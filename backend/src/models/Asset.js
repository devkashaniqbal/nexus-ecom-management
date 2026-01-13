import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  assetId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Asset name is required'],
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['laptop', 'desktop', 'monitor', 'phone', 'tablet', 'keyboard', 'mouse', 'headset', 'other']
  },
  brand: {
    type: String
  },
  model: {
    type: String
  },
  serialNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  specifications: {
    type: Map,
    of: String
  },
  purchaseDate: {
    type: Date
  },
  purchasePrice: {
    type: Number
  },
  warranty: {
    startDate: Date,
    endDate: Date,
    provider: String
  },
  status: {
    type: String,
    enum: ['available', 'assigned', 'maintenance', 'retired', 'lost'],
    default: 'available'
  },
  currentAssignment: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedDate: Date,
    expectedReturnDate: Date,
    notes: String
  },
  assignmentHistory: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedDate: {
      type: Date,
      required: true
    },
    returnedDate: {
      type: Date
    },
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor']
    },
    notes: String
  }],
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'damaged'],
    default: 'excellent'
  },
  location: {
    type: String
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

assetSchema.index({ assetId: 1 });
assetSchema.index({ category: 1 });
assetSchema.index({ status: 1 });
assetSchema.index({ 'currentAssignment.user': 1 });

const Asset = mongoose.model('Asset', assetSchema);

export default Asset;
