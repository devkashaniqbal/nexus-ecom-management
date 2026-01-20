import mongoose from 'mongoose';

const salaryRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  baseSalary: {
    type: Number,
    required: true
  },
  workingDays: {
    type: Number,
    default: 0
  },
  presentDays: {
    type: Number,
    default: 0
  },
  absentDays: {
    type: Number,
    default: 0
  },
  lateDays: {
    type: Number,
    default: 0
  },
  totalLateMinutes: {
    type: Number,
    default: 0
  },
  lateDeduction: {
    type: Number,
    default: 0
  },
  absentDeduction: {
    type: Number,
    default: 0
  },
  overtimeHours: {
    type: Number,
    default: 0
  },
  overtimeAmount: {
    type: Number,
    default: 0
  },
  bonus: {
    type: Number,
    default: 0
  },
  bonusReason: {
    type: String
  },
  otherDeductions: {
    type: Number,
    default: 0
  },
  otherDeductionsReason: {
    type: String
  },
  netSalary: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'paid'],
    default: 'draft'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  paidAt: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'cheque'],
  },
  paymentReference: {
    type: String
  },
  notes: {
    type: String
  },
  breakdown: {
    perDaySalary: Number,
    perHourSalary: Number,
    perMinuteSalary: Number
  }
}, {
  timestamps: true
});

salaryRecordSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });
salaryRecordSchema.index({ status: 1 });
salaryRecordSchema.index({ year: 1, month: 1 });

const SalaryRecord = mongoose.model('SalaryRecord', salaryRecordSchema);

export default SalaryRecord;
