import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  contacts: [{
    name: String,
    email: String,
    phone: String,
    designation: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  website: {
    type: String
  },
  industry: {
    type: String
  },
  contractStartDate: {
    type: Date
  },
  contractEndDate: {
    type: Date
  },
  paymentTerms: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

clientSchema.index({ email: 1 });
clientSchema.index({ companyName: 1 });
clientSchema.index({ isActive: 1 });

const Client = mongoose.model('Client', clientSchema);

export default Client;
