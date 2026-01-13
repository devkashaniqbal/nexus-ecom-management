import express from 'express';
import { protect, restrictTo, isManagerOrAbove } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Get all timesheets with filtering
router.get('/', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Timesheet = (await import('../models/Timesheet.js')).default;
    const { status, user, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};
    if (user) query.user = user;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.weekStartDate = {};
      if (startDate) query.weekStartDate.$gte = new Date(startDate);
      if (endDate) query.weekStartDate.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const timesheets = await Timesheet.find(query)
      .populate('user', 'firstName lastName employeeId email')
      .populate('approvedBy', 'firstName lastName employeeId')
      .sort({ weekStartDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Timesheet.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        timesheets,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user's timesheets
router.get('/my-timesheets', async (req, res, next) => {
  try {
    const Timesheet = (await import('../models/Timesheet.js')).default;
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = { user: req.user._id };
    if (status) query.status = status;
    if (startDate || endDate) {
      query.weekStartDate = {};
      if (startDate) query.weekStartDate.$gte = new Date(startDate);
      if (endDate) query.weekStartDate.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const timesheets = await Timesheet.find(query)
      .populate('approvedBy', 'firstName lastName employeeId')
      .sort({ weekStartDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Timesheet.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        timesheets,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single timesheet
router.get('/:id', async (req, res, next) => {
  try {
    const Timesheet = (await import('../models/Timesheet.js')).default;
    const timesheet = await Timesheet.findById(req.params.id)
      .populate('user', 'firstName lastName employeeId email')
      .populate('approvedBy', 'firstName lastName employeeId');

    if (!timesheet) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Timesheet not found', 404));
    }

    // User can only view their own timesheet or managers can view their team's
    if (req.user._id.toString() !== timesheet.user._id.toString() && req.user.role !== 'admin') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to view this timesheet', 403));
    }

    res.status(200).json({ status: 'success', data: { timesheet } });
  } catch (error) {
    next(error);
  }
});

// Create timesheet
router.post('/', async (req, res, next) => {
  try {
    const Timesheet = (await import('../models/Timesheet.js')).default;
    const { weekStartDate, entries, totalHours } = req.body;

    if (!entries || entries.length === 0) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Timesheet entries are required', 400));
    }

    // Check if timesheet already exists for this week
    const existingTimesheet = await Timesheet.findOne({
      user: req.user._id,
      weekStartDate: new Date(weekStartDate)
    });

    if (existingTimesheet) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Timesheet already exists for this week', 409));
    }

    const timesheet = await Timesheet.create({
      user: req.user._id,
      weekStartDate: new Date(weekStartDate),
      entries,
      totalHours,
      status: 'draft'
    });

    const populatedTimesheet = await timesheet.populate('user', 'firstName lastName employeeId');

    res.status(201).json({
      status: 'success',
      message: 'Timesheet created successfully',
      data: { timesheet: populatedTimesheet }
    });
  } catch (error) {
    next(error);
  }
});

// Update timesheet (only for draft status)
router.put('/:id', async (req, res, next) => {
  try {
    const Timesheet = (await import('../models/Timesheet.js')).default;
    const timesheet = await Timesheet.findById(req.params.id);

    if (!timesheet) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Timesheet not found', 404));
    }

    // Only owner can edit draft timesheets
    if (req.user._id.toString() !== timesheet.user.toString()) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to update this timesheet', 403));
    }

    if (timesheet.status !== 'draft') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Cannot update timesheet that has been submitted', 400));
    }

    const { entries, totalHours } = req.body;
    const updatedTimesheet = await Timesheet.findByIdAndUpdate(
      req.params.id,
      { entries, totalHours },
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      message: 'Timesheet updated successfully',
      data: { timesheet: updatedTimesheet }
    });
  } catch (error) {
    next(error);
  }
});

// Submit timesheet for approval
router.post('/:id/submit', async (req, res, next) => {
  try {
    const Timesheet = (await import('../models/Timesheet.js')).default;
    const timesheet = await Timesheet.findById(req.params.id);

    if (!timesheet) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Timesheet not found', 404));
    }

    // Only owner can submit
    if (req.user._id.toString() !== timesheet.user.toString()) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to submit this timesheet', 403));
    }

    if (timesheet.status !== 'draft') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Timesheet has already been submitted', 400));
    }

    const updatedTimesheet = await Timesheet.findByIdAndUpdate(
      req.params.id,
      { status: 'submitted', submittedAt: new Date() },
      { new: true }
    ).populate('user', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      message: 'Timesheet submitted successfully',
      data: { timesheet: updatedTimesheet }
    });
  } catch (error) {
    next(error);
  }
});

// Approve timesheet
router.post('/:id/approve', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Timesheet = (await import('../models/Timesheet.js')).default;
    const { approvalNotes } = req.body;

    const timesheet = await Timesheet.findById(req.params.id);

    if (!timesheet) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Timesheet not found', 404));
    }

    if (timesheet.status !== 'submitted') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Only submitted timesheets can be approved', 400));
    }

    const updatedTimesheet = await Timesheet.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
        approvalNotes
      },
      { new: true }
    ).populate('user', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      message: 'Timesheet approved successfully',
      data: { timesheet: updatedTimesheet }
    });
  } catch (error) {
    next(error);
  }
});

// Reject timesheet
router.post('/:id/reject', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Timesheet = (await import('../models/Timesheet.js')).default;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Rejection reason is required', 400));
    }

    const timesheet = await Timesheet.findById(req.params.id);

    if (!timesheet) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Timesheet not found', 404));
    }

    if (timesheet.status !== 'submitted') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Only submitted timesheets can be rejected', 400));
    }

    const updatedTimesheet = await Timesheet.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectionReason,
        rejectedAt: new Date()
      },
      { new: true }
    ).populate('user', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      message: 'Timesheet rejected successfully',
      data: { timesheet: updatedTimesheet }
    });
  } catch (error) {
    next(error);
  }
});

// Delete timesheet (only draft)
router.delete('/:id', async (req, res, next) => {
  try {
    const Timesheet = (await import('../models/Timesheet.js')).default;
    const timesheet = await Timesheet.findById(req.params.id);

    if (!timesheet) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Timesheet not found', 404));
    }

    // Only owner or admin can delete
    if (req.user._id.toString() !== timesheet.user.toString() && req.user.role !== 'admin') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to delete this timesheet', 403));
    }

    if (timesheet.status !== 'draft') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Cannot delete submitted or approved timesheet', 400));
    }

    await Timesheet.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Timesheet deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
