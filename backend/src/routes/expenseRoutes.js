import express from 'express';
import { protect, restrictTo, isManagerOrAbove } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Get all expenses with filtering
router.get('/', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Expense = (await import('../models/Expense.js')).default;
    const { status, category, user, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (user) query.submittedBy = user;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const expenses = await Expense.find(query)
      .populate('submittedBy', 'firstName lastName employeeId email')
      .populate('approvedBy', 'firstName lastName employeeId')
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Expense.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        expenses,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user's expenses
router.get('/my-expenses', async (req, res, next) => {
  try {
    const Expense = (await import('../models/Expense.js')).default;
    const { status, category, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = { submittedBy: req.user._id };
    if (status) query.status = status;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const expenses = await Expense.find(query)
      .populate('approvedBy', 'firstName lastName employeeId')
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Expense.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        expenses,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single expense
router.get('/:id', async (req, res, next) => {
  try {
    const Expense = (await import('../models/Expense.js')).default;
    const expense = await Expense.findById(req.params.id)
      .populate('submittedBy', 'firstName lastName employeeId email')
      .populate('approvedBy', 'firstName lastName employeeId');

    if (!expense) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Expense not found', 404));
    }

    // User can view their own expense or managers/admin
    if (req.user._id.toString() !== expense.submittedBy._id.toString() && req.user.role !== 'admin' && req.user.role !== 'manager') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to view this expense', 403));
    }

    res.status(200).json({ status: 'success', data: { expense } });
  } catch (error) {
    next(error);
  }
});

// Create expense
router.post('/', async (req, res, next) => {
  try {
    const Expense = (await import('../models/Expense.js')).default;
    const { category, amount, description, date, attachmentUrl } = req.body;

    if (!category || !amount || !date) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Category, amount, and date are required', 400));
    }

    if (amount <= 0) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Amount must be greater than zero', 400));
    }

    const expense = await Expense.create({
      category,
      amount,
      description,
      date: new Date(date),
      submittedBy: req.user._id,
      status: 'pending',
      attachmentUrl
    });

    const populatedExpense = await expense.populate('submittedBy', 'firstName lastName employeeId');

    res.status(201).json({
      status: 'success',
      message: 'Expense created successfully',
      data: { expense: populatedExpense }
    });
  } catch (error) {
    next(error);
  }
});

// Update expense (only pending)
router.put('/:id', async (req, res, next) => {
  try {
    const Expense = (await import('../models/Expense.js')).default;
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Expense not found', 404));
    }

    // Only owner can edit pending expenses
    if (req.user._id.toString() !== expense.submittedBy.toString()) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to update this expense', 403));
    }

    if (expense.status !== 'pending') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Cannot update expense that has been approved or rejected', 400));
    }

    const { category, amount, description, date, attachmentUrl } = req.body;

    if (amount && amount <= 0) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Amount must be greater than zero', 400));
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      { category, amount, description, date: date ? new Date(date) : undefined, attachmentUrl },
      { new: true, runValidators: true }
    ).populate('submittedBy', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      message: 'Expense updated successfully',
      data: { expense: updatedExpense }
    });
  } catch (error) {
    next(error);
  }
});

// Approve expense
router.post('/:id/approve', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Expense = (await import('../models/Expense.js')).default;
    const { approvalNotes } = req.body;

    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Expense not found', 404));
    }

    if (expense.status !== 'pending') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Only pending expenses can be approved', 400));
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
        approvalNotes
      },
      { new: true }
    ).populate('submittedBy', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      message: 'Expense approved successfully',
      data: { expense: updatedExpense }
    });
  } catch (error) {
    next(error);
  }
});

// Reject expense
router.post('/:id/reject', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Expense = (await import('../models/Expense.js')).default;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Rejection reason is required', 400));
    }

    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Expense not found', 404));
    }

    if (expense.status !== 'pending') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Only pending expenses can be rejected', 400));
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectionReason,
        rejectedAt: new Date()
      },
      { new: true }
    ).populate('submittedBy', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      message: 'Expense rejected successfully',
      data: { expense: updatedExpense }
    });
  } catch (error) {
    next(error);
  }
});

// Delete expense (only pending)
router.delete('/:id', async (req, res, next) => {
  try {
    const Expense = (await import('../models/Expense.js')).default;
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Expense not found', 404));
    }

    // Only owner or admin can delete
    if (req.user._id.toString() !== expense.submittedBy.toString() && req.user.role !== 'admin') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to delete this expense', 403));
    }

    if (expense.status !== 'pending') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Cannot delete approved or rejected expense', 400));
    }

    await Expense.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
