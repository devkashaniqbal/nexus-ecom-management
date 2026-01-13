import express from 'express';
import { protect, restrictTo, isManagerOrAbove } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Get all leave requests
router.get('/', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Leave = (await import('../models/Leave.js')).default;
    const { status, leaveType, user, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;
    if (user) query.employee = user;
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const leaves = await Leave.find(query)
      .populate('employee', 'firstName lastName employeeId email')
      .populate('approvedBy', 'firstName lastName employeeId')
      .sort({ startDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Leave.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        leaves,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user's leave requests
router.get('/my-leaves', async (req, res, next) => {
  try {
    const Leave = (await import('../models/Leave.js')).default;
    const { status, leaveType, page = 1, limit = 20 } = req.query;

    const query = { employee: req.user._id };
    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;

    const skip = (page - 1) * limit;
    const leaves = await Leave.find(query)
      .populate('approvedBy', 'firstName lastName employeeId')
      .sort({ startDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Leave.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        leaves,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single leave request
router.get('/:id', async (req, res, next) => {
  try {
    const Leave = (await import('../models/Leave.js')).default;
    const leave = await Leave.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId email department')
      .populate('approvedBy', 'firstName lastName employeeId');

    if (!leave) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Leave request not found', 404));
    }

    // User can view their own leave or managers/admin
    if (req.user._id.toString() !== leave.employee._id.toString() && req.user.role !== 'admin' && req.user.role !== 'manager') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to view this leave request', 403));
    }

    res.status(200).json({ status: 'success', data: { leave } });
  } catch (error) {
    next(error);
  }
});

// Apply for leave
router.post('/', async (req, res, next) => {
  try {
    const Leave = (await import('../models/Leave.js')).default;
    const { leaveType, startDate, endDate, reason, attachmentUrl } = req.body;

    if (!leaveType || !startDate || !endDate) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Leave type, start date, and end date are required', 400));
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Start date cannot be after end date', 400));
    }

    // Calculate days
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (days <= 0) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Leave duration must be at least 1 day', 400));
    }

    const leave = await Leave.create({
      employee: req.user._id,
      leaveType,
      startDate: start,
      endDate: end,
      days,
      reason,
      status: 'pending',
      attachmentUrl
    });

    const populatedLeave = await leave.populate('employee', 'firstName lastName employeeId');

    res.status(201).json({
      status: 'success',
      message: 'Leave request submitted successfully',
      data: { leave: populatedLeave }
    });
  } catch (error) {
    next(error);
  }
});

// Update leave request (only pending)
router.put('/:id', async (req, res, next) => {
  try {
    const Leave = (await import('../models/Leave.js')).default;
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Leave request not found', 404));
    }

    // Only owner can edit pending leaves
    if (req.user._id.toString() !== leave.employee.toString()) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to update this leave request', 403));
    }

    if (leave.status !== 'pending') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Cannot update leave that has been approved or rejected', 400));
    }

    const { leaveType, startDate, endDate, reason, attachmentUrl } = req.body;

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : leave.startDate;
      const end = endDate ? new Date(endDate) : leave.endDate;

      if (start > end) {
        const { AppError } = await import('../utils/appError.js');
        return next(new AppError('Start date cannot be after end date', 400));
      }

      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      const updatedLeave = await Leave.findByIdAndUpdate(
        req.params.id,
        { leaveType, startDate: start, endDate: end, days, reason, attachmentUrl },
        { new: true, runValidators: true }
      ).populate('employee', 'firstName lastName employeeId');

      return res.status(200).json({
        status: 'success',
        message: 'Leave request updated successfully',
        data: { leave: updatedLeave }
      });
    }

    const updatedLeave = await Leave.findByIdAndUpdate(
      req.params.id,
      { leaveType, reason, attachmentUrl },
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      message: 'Leave request updated successfully',
      data: { leave: updatedLeave }
    });
  } catch (error) {
    next(error);
  }
});

// Approve leave
router.post('/:id/approve', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Leave = (await import('../models/Leave.js')).default;
    const { approvalNotes } = req.body;

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Leave request not found', 404));
    }

    if (leave.status !== 'pending') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Only pending leave requests can be approved', 400));
    }

    const updatedLeave = await Leave.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
        approvalNotes
      },
      { new: true }
    ).populate('employee', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      message: 'Leave request approved successfully',
      data: { leave: updatedLeave }
    });
  } catch (error) {
    next(error);
  }
});

// Reject leave
router.post('/:id/reject', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Leave = (await import('../models/Leave.js')).default;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Rejection reason is required', 400));
    }

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Leave request not found', 404));
    }

    if (leave.status !== 'pending') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Only pending leave requests can be rejected', 400));
    }

    const updatedLeave = await Leave.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectionReason,
        rejectedAt: new Date()
      },
      { new: true }
    ).populate('employee', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      message: 'Leave request rejected successfully',
      data: { leave: updatedLeave }
    });
  } catch (error) {
    next(error);
  }
});

// Cancel leave (only pending or approved, before start date)
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const Leave = (await import('../models/Leave.js')).default;
    const { cancellationReason } = req.body;

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Leave request not found', 404));
    }

    // Only owner or admin can cancel
    if (req.user._id.toString() !== leave.employee.toString() && req.user.role !== 'admin') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to cancel this leave request', 403));
    }

    if (!['pending', 'approved'].includes(leave.status)) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Only pending or approved leave can be cancelled', 400));
    }

    const now = new Date();
    if (leave.startDate < now) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Cannot cancel leave that has already started', 400));
    }

    const updatedLeave = await Leave.findByIdAndUpdate(
      req.params.id,
      {
        status: 'cancelled',
        cancellationReason,
        cancelledAt: new Date()
      },
      { new: true }
    ).populate('employee', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      message: 'Leave request cancelled successfully',
      data: { leave: updatedLeave }
    });
  } catch (error) {
    next(error);
  }
});

// Delete leave (only pending)
router.delete('/:id', async (req, res, next) => {
  try {
    const Leave = (await import('../models/Leave.js')).default;
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Leave request not found', 404));
    }

    // Only owner or admin can delete
    if (req.user._id.toString() !== leave.employee.toString() && req.user.role !== 'admin') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to delete this leave request', 403));
    }

    if (leave.status !== 'pending') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Cannot delete leave that has been approved or rejected', 400));
    }

    await Leave.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Leave request deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
