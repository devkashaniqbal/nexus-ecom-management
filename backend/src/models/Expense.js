import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['reimbursement', 'petty_cash', 'company_expense'],
    default: 'reimbursement'
  },
  category: {
    type: String,
    required: true,
    enum: ['travel', 'food', 'accommodation', 'equipment', 'software', 'training', 'entertainment', 'office_supplies', 'other']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  receipts: [{
    url: String,
    s3Key: String,
    fileName: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  paidAt: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'check', 'other']
  },
  transactionId: {
    type: String
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ project: 1 });
expenseSchema.index({ date: -1 });

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;
