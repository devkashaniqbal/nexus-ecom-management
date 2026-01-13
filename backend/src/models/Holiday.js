import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Holiday name is required'],
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['public', 'company', 'optional'],
    default: 'public'
  },
  description: {
    type: String
  },
  applicableTo: {
    departments: [{
      type: String
    }],
    locations: [{
      type: String
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

holidaySchema.index({ date: 1 });
holidaySchema.index({ type: 1 });
holidaySchema.index({ isActive: 1 });

const Holiday = mongoose.model('Holiday', holidaySchema);

export default Holiday;
