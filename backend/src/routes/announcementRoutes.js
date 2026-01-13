import express from 'express';
import { protect, restrictTo, isManagerOrAbove } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Get all announcements with pagination
router.get('/', async (req, res, next) => {
  try {
    const Announcement = (await import('../models/Announcement.js')).default;
    const { category, page = 1, limit = 20 } = req.query;

    const query = { isActive: true };
    if (category) query.category = category;

    const skip = (page - 1) * limit;
    const announcements = await Announcement.find(query)
      .populate('createdBy', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Announcement.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        announcements,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all announcements (admin/manager - including inactive)
router.get('/admin/all', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Announcement = (await import('../models/Announcement.js')).default;
    const { category, page = 1, limit = 20 } = req.query;

    const query = {};
    if (category) query.category = category;

    const skip = (page - 1) * limit;
    const announcements = await Announcement.find(query)
      .populate('createdBy', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Announcement.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        announcements,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single announcement
router.get('/:id', async (req, res, next) => {
  try {
    const Announcement = (await import('../models/Announcement.js')).default;
    const announcement = await Announcement.findById(req.params.id)
      .populate('createdBy', 'firstName lastName employeeId email');

    if (!announcement) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Announcement not found', 404));
    }

    // Check if active or user is admin/manager
    if (!announcement.isActive && req.user.role !== 'admin' && req.user.role !== 'manager') {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Announcement not found', 404));
    }

    res.status(200).json({ status: 'success', data: { announcement } });
  } catch (error) {
    next(error);
  }
});

// Create announcement
router.post('/', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Announcement = (await import('../models/Announcement.js')).default;
    const { title, content, category, priority, attachmentUrl, expiryDate } = req.body;

    if (!title || !content) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Title and content are required', 400));
    }

    const announcement = await Announcement.create({
      title,
      content,
      category: category || 'general',
      priority: priority || 'normal',
      createdBy: req.user._id,
      attachmentUrl,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      isActive: true,
      readBy: []
    });

    const populatedAnnouncement = await announcement.populate('createdBy', 'firstName lastName employeeId');

    res.status(201).json({
      status: 'success',
      message: 'Announcement created successfully',
      data: { announcement: populatedAnnouncement }
    });
  } catch (error) {
    next(error);
  }
});

// Update announcement
router.put('/:id', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Announcement = (await import('../models/Announcement.js')).default;
    const { title, content, category, priority, attachmentUrl, expiryDate, isActive } = req.body;

    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Announcement not found', 404));
    }

    // Only creator or admin can update
    if (req.user.role !== 'admin' && announcement.createdBy.toString() !== req.user._id.toString()) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to update this announcement', 403));
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { title, content, category, priority, attachmentUrl, expiryDate: expiryDate ? new Date(expiryDate) : undefined, isActive },
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      message: 'Announcement updated successfully',
      data: { announcement: updatedAnnouncement }
    });
  } catch (error) {
    next(error);
  }
});

// Mark announcement as read
router.post('/:id/mark-read', async (req, res, next) => {
  try {
    const Announcement = (await import('../models/Announcement.js')).default;
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Announcement not found', 404));
    }

    // Check if user has already read
    const hasRead = announcement.readBy && announcement.readBy.some(
      id => id.toString() === req.user._id.toString()
    );

    if (!hasRead) {
      if (!announcement.readBy) {
        announcement.readBy = [];
      }
      announcement.readBy.push(req.user._id);
      await announcement.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Announcement marked as read'
    });
  } catch (error) {
    next(error);
  }
});

// Mark announcement as unread
router.post('/:id/mark-unread', async (req, res, next) => {
  try {
    const Announcement = (await import('../models/Announcement.js')).default;
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Announcement not found', 404));
    }

    if (announcement.readBy) {
      announcement.readBy = announcement.readBy.filter(
        id => id.toString() !== req.user._id.toString()
      );
      await announcement.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Announcement marked as unread'
    });
  } catch (error) {
    next(error);
  }
});

// Get unread announcements count
router.get('/unread/count', async (req, res, next) => {
  try {
    const Announcement = (await import('../models/Announcement.js')).default;

    const count = await Announcement.countDocuments({
      isActive: true,
      $or: [
        { readBy: { $nin: [req.user._id] } },
        { readBy: { $exists: false } }
      ]
    });

    res.status(200).json({
      status: 'success',
      data: { unreadCount: count }
    });
  } catch (error) {
    next(error);
  }
});

// Delete announcement
router.delete('/:id', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Announcement = (await import('../models/Announcement.js')).default;
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Announcement not found', 404));
    }

    // Only creator or admin can delete
    if (req.user.role !== 'admin' && announcement.createdBy.toString() !== req.user._id.toString()) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to delete this announcement', 403));
    }

    await Announcement.findByIdAndUpdate(req.params.id, { isActive: false });

    res.status(200).json({
      status: 'success',
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
