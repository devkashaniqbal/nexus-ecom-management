import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import SalaryRecord from '../models/Salary.js';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import { AppError } from '../utils/appError.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin', 'manager'));

// Get settings
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await Settings.getAllSettings();
    res.status(200).json({
      status: 'success',
      data: { settings }
    });
  } catch (error) {
    next(error);
  }
});

// Update settings
router.put('/settings', restrictTo('admin'), async (req, res, next) => {
  try {
    const updates = req.body;
    const results = {};

    for (const [key, value] of Object.entries(updates)) {
      const setting = await Settings.setSetting(key, value, req.user._id);
      results[key] = setting.value;
    }

    res.status(200).json({
      status: 'success',
      data: { settings: results }
    });
  } catch (error) {
    next(error);
  }
});

// Calculate salary for a user for a specific month
router.post('/calculate/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.body;

    if (!month || !year) {
      return next(new AppError('Month and year are required', 400));
    }

    const user = await User.findById(userId).select('+salary');
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (!user.salary) {
      return next(new AppError('User salary not set', 400));
    }

    const settings = await Settings.getAllSettings();
    const officeStartTime = settings.officeStartTime || '10:00';
    const gracePeriod = settings.lateGracePeriodMinutes || 15;
    const workingDaysPerMonth = settings.workingDaysPerMonth || 22;
    const workingHoursPerDay = settings.workingHoursPerDay || 8;

    // Get attendance records for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendanceRecords = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    });

    let presentDays = 0;
    let lateDays = 0;
    let totalLateMinutes = 0;
    let totalOvertimeMinutes = 0;

    const [officeHour, officeMinute] = officeStartTime.split(':').map(Number);

    attendanceRecords.forEach(record => {
      if (record.checkIn) {
        presentDays++;

        const checkInTime = new Date(record.checkIn);
        const scheduledStart = new Date(record.date);
        scheduledStart.setHours(officeHour, officeMinute, 0, 0);

        const lateMinutes = Math.max(0, (checkInTime - scheduledStart) / (1000 * 60));

        if (lateMinutes > gracePeriod) {
          lateDays++;
          totalLateMinutes += lateMinutes;
        }

        // Calculate overtime
        if (record.checkOut && record.totalHours > workingHoursPerDay) {
          totalOvertimeMinutes += (record.totalHours - workingHoursPerDay) * 60;
        }
      }
    });

    const baseSalary = user.salary;
    const perDaySalary = baseSalary / workingDaysPerMonth;
    const perHourSalary = perDaySalary / workingHoursPerDay;
    const perMinuteSalary = perHourSalary / 60;

    const absentDays = Math.max(0, workingDaysPerMonth - presentDays);
    const lateDeduction = Math.round(totalLateMinutes * perMinuteSalary);
    const absentDeduction = Math.round(absentDays * perDaySalary);
    const overtimeHours = Math.round(totalOvertimeMinutes / 60 * 10) / 10;
    const overtimeAmount = Math.round(overtimeHours * perHourSalary * (settings.overtimeRateMultiplier || 1.5));

    const netSalary = Math.round(baseSalary - lateDeduction - absentDeduction + overtimeAmount);

    // Check if record already exists
    let salaryRecord = await SalaryRecord.findOne({ user: userId, month, year });

    if (salaryRecord) {
      // Update existing
      salaryRecord.baseSalary = baseSalary;
      salaryRecord.workingDays = workingDaysPerMonth;
      salaryRecord.presentDays = presentDays;
      salaryRecord.absentDays = absentDays;
      salaryRecord.lateDays = lateDays;
      salaryRecord.totalLateMinutes = Math.round(totalLateMinutes);
      salaryRecord.lateDeduction = lateDeduction;
      salaryRecord.absentDeduction = absentDeduction;
      salaryRecord.overtimeHours = overtimeHours;
      salaryRecord.overtimeAmount = overtimeAmount;
      salaryRecord.netSalary = netSalary + (salaryRecord.bonus || 0) - (salaryRecord.otherDeductions || 0);
      salaryRecord.breakdown = { perDaySalary, perHourSalary, perMinuteSalary };
      await salaryRecord.save();
    } else {
      // Create new
      salaryRecord = await SalaryRecord.create({
        user: userId,
        month,
        year,
        baseSalary,
        workingDays: workingDaysPerMonth,
        presentDays,
        absentDays,
        lateDays,
        totalLateMinutes: Math.round(totalLateMinutes),
        lateDeduction,
        absentDeduction,
        overtimeHours,
        overtimeAmount,
        netSalary,
        breakdown: { perDaySalary, perHourSalary, perMinuteSalary }
      });
    }

    await salaryRecord.populate('user', 'firstName lastName email employeeId department');

    res.status(200).json({
      status: 'success',
      data: { salaryRecord }
    });
  } catch (error) {
    next(error);
  }
});

// Get all salary records
router.get('/', async (req, res, next) => {
  try {
    const { month, year, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const records = await SalaryRecord.find(query)
      .populate('user', 'firstName lastName email employeeId department designation')
      .populate('approvedBy', 'firstName lastName')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await SalaryRecord.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        records,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get salary record by ID
router.get('/:id', async (req, res, next) => {
  try {
    const record = await SalaryRecord.findById(req.params.id)
      .populate('user', 'firstName lastName email employeeId department designation salary')
      .populate('approvedBy', 'firstName lastName');

    if (!record) {
      return next(new AppError('Salary record not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { record }
    });
  } catch (error) {
    next(error);
  }
});

// Update salary record (add bonus, deductions, notes)
router.put('/:id', async (req, res, next) => {
  try {
    const { bonus, bonusReason, otherDeductions, otherDeductionsReason, notes } = req.body;

    const record = await SalaryRecord.findById(req.params.id);
    if (!record) {
      return next(new AppError('Salary record not found', 404));
    }

    if (record.status === 'paid') {
      return next(new AppError('Cannot modify a paid salary record', 400));
    }

    if (bonus !== undefined) record.bonus = bonus;
    if (bonusReason !== undefined) record.bonusReason = bonusReason;
    if (otherDeductions !== undefined) record.otherDeductions = otherDeductions;
    if (otherDeductionsReason !== undefined) record.otherDeductionsReason = otherDeductionsReason;
    if (notes !== undefined) record.notes = notes;

    // Recalculate net salary
    record.netSalary = record.baseSalary - record.lateDeduction - record.absentDeduction +
                       record.overtimeAmount + (record.bonus || 0) - (record.otherDeductions || 0);

    await record.save();
    await record.populate('user', 'firstName lastName email employeeId department');

    res.status(200).json({
      status: 'success',
      data: { record }
    });
  } catch (error) {
    next(error);
  }
});

// Approve salary record
router.post('/:id/approve', restrictTo('admin'), async (req, res, next) => {
  try {
    const record = await SalaryRecord.findById(req.params.id);
    if (!record) {
      return next(new AppError('Salary record not found', 404));
    }

    if (record.status === 'paid') {
      return next(new AppError('Salary already paid', 400));
    }

    record.status = 'approved';
    record.approvedBy = req.user._id;
    record.approvedAt = new Date();
    await record.save();

    await record.populate('user', 'firstName lastName email employeeId department');
    await record.populate('approvedBy', 'firstName lastName');

    res.status(200).json({
      status: 'success',
      data: { record }
    });
  } catch (error) {
    next(error);
  }
});

// Mark salary as paid
router.post('/:id/pay', restrictTo('admin'), async (req, res, next) => {
  try {
    const { paymentMethod, paymentReference } = req.body;

    const record = await SalaryRecord.findById(req.params.id);
    if (!record) {
      return next(new AppError('Salary record not found', 404));
    }

    if (record.status !== 'approved') {
      return next(new AppError('Salary must be approved before payment', 400));
    }

    record.status = 'paid';
    record.paidAt = new Date();
    record.paymentMethod = paymentMethod;
    record.paymentReference = paymentReference;
    await record.save();

    await record.populate('user', 'firstName lastName email employeeId department');

    res.status(200).json({
      status: 'success',
      data: { record }
    });
  } catch (error) {
    next(error);
  }
});

// Generate salary for all active users for a month
router.post('/generate-all', restrictTo('admin'), async (req, res, next) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return next(new AppError('Month and year are required', 400));
    }

    const users = await User.find({ isActive: true }).select('+salary');
    const settings = await Settings.getAllSettings();
    const officeStartTime = settings.officeStartTime || '10:00';
    const gracePeriod = settings.lateGracePeriodMinutes || 15;
    const workingDaysPerMonth = settings.workingDaysPerMonth || 22;
    const workingHoursPerDay = settings.workingHoursPerDay || 8;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const [officeHour, officeMinute] = officeStartTime.split(':').map(Number);

    const results = [];

    for (const user of users) {
      if (!user.salary) continue;

      const attendanceRecords = await Attendance.find({
        user: user._id,
        date: { $gte: startDate, $lte: endDate }
      });

      let presentDays = 0;
      let lateDays = 0;
      let totalLateMinutes = 0;
      let totalOvertimeMinutes = 0;

      attendanceRecords.forEach(record => {
        if (record.checkIn) {
          presentDays++;

          const checkInTime = new Date(record.checkIn);
          const scheduledStart = new Date(record.date);
          scheduledStart.setHours(officeHour, officeMinute, 0, 0);

          const lateMinutes = Math.max(0, (checkInTime - scheduledStart) / (1000 * 60));

          if (lateMinutes > gracePeriod) {
            lateDays++;
            totalLateMinutes += lateMinutes;
          }

          if (record.checkOut && record.totalHours > workingHoursPerDay) {
            totalOvertimeMinutes += (record.totalHours - workingHoursPerDay) * 60;
          }
        }
      });

      const baseSalary = user.salary;
      const perDaySalary = baseSalary / workingDaysPerMonth;
      const perHourSalary = perDaySalary / workingHoursPerDay;
      const perMinuteSalary = perHourSalary / 60;

      const absentDays = Math.max(0, workingDaysPerMonth - presentDays);
      const lateDeduction = Math.round(totalLateMinutes * perMinuteSalary);
      const absentDeduction = Math.round(absentDays * perDaySalary);
      const overtimeHours = Math.round(totalOvertimeMinutes / 60 * 10) / 10;
      const overtimeAmount = Math.round(overtimeHours * perHourSalary * (settings.overtimeRateMultiplier || 1.5));

      const netSalary = Math.round(baseSalary - lateDeduction - absentDeduction + overtimeAmount);

      const salaryRecord = await SalaryRecord.findOneAndUpdate(
        { user: user._id, month, year },
        {
          baseSalary,
          workingDays: workingDaysPerMonth,
          presentDays,
          absentDays,
          lateDays,
          totalLateMinutes: Math.round(totalLateMinutes),
          lateDeduction,
          absentDeduction,
          overtimeHours,
          overtimeAmount,
          netSalary,
          breakdown: { perDaySalary, perHourSalary, perMinuteSalary }
        },
        { upsert: true, new: true }
      );

      results.push(salaryRecord);
    }

    res.status(200).json({
      status: 'success',
      message: `Generated salary records for ${results.length} users`,
      data: { count: results.length }
    });
  } catch (error) {
    next(error);
  }
});

// Get salary summary/stats
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const query = {};
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const records = await SalaryRecord.find(query);

    const stats = {
      totalRecords: records.length,
      totalBaseSalary: 0,
      totalDeductions: 0,
      totalBonus: 0,
      totalNetSalary: 0,
      totalLateMinutes: 0,
      byStatus: { draft: 0, pending: 0, approved: 0, paid: 0 }
    };

    records.forEach(r => {
      stats.totalBaseSalary += r.baseSalary;
      stats.totalDeductions += r.lateDeduction + r.absentDeduction + (r.otherDeductions || 0);
      stats.totalBonus += r.bonus || 0;
      stats.totalNetSalary += r.netSalary;
      stats.totalLateMinutes += r.totalLateMinutes;
      stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
    });

    res.status(200).json({
      status: 'success',
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
