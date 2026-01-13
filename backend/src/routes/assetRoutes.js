import express from 'express';
import { protect, restrictTo, isManagerOrAbove } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Get all assets with pagination and filtering
router.get('/', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Asset = (await import('../models/Asset.js')).default;
    const { category, status, assignedTo, page = 1, limit = 20 } = req.query;

    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;

    const skip = (page - 1) * limit;
    const assets = await Asset.find(query)
      .populate('assignedTo', 'firstName lastName employeeId')
      .populate('history.assignedBy', 'firstName lastName')
      .populate('history.assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Asset.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        assets,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get assets assigned to current user
router.get('/my-assets', async (req, res, next) => {
  try {
    const Asset = (await import('../models/Asset.js')).default;
    const { category, status, page = 1, limit = 20 } = req.query;

    const query = { assignedTo: req.user._id };
    if (category) query.category = category;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const assets = await Asset.find(query)
      .populate('assignedTo', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Asset.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        assets,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single asset details
router.get('/:id', async (req, res, next) => {
  try {
    const Asset = (await import('../models/Asset.js')).default;
    const asset = await Asset.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName employeeId email')
      .populate('history.assignedBy', 'firstName lastName employeeId')
      .populate('history.assignedTo', 'firstName lastName employeeId');

    if (!asset) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Asset not found', 404));
    }

    res.status(200).json({ status: 'success', data: { asset } });
  } catch (error) {
    next(error);
  }
});

// Create new asset
router.post('/', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Asset = (await import('../models/Asset.js')).default;
    const { assetTag, name, category, description, serialNumber, purchaseDate, cost, status } = req.body;

    if (!assetTag || !name || !category) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Asset tag, name, and category are required', 400));
    }

    const asset = await Asset.create({
      assetTag,
      name,
      category,
      description,
      serialNumber,
      purchaseDate,
      cost,
      status: status || 'available',
      assignedTo: null
    });

    res.status(201).json({
      status: 'success',
      message: 'Asset created successfully',
      data: { asset }
    });
  } catch (error) {
    next(error);
  }
});

// Update asset details
router.put('/:id', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Asset = (await import('../models/Asset.js')).default;
    const { name, category, description, serialNumber, purchaseDate, cost, status } = req.body;

    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Asset not found', 404));
    }

    const updatedAsset = await Asset.findByIdAndUpdate(
      req.params.id,
      { name, category, description, serialNumber, purchaseDate, cost, status },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      message: 'Asset updated successfully',
      data: { asset: updatedAsset }
    });
  } catch (error) {
    next(error);
  }
});

// Assign asset to user
router.post('/:id/assign', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Asset = (await import('../models/Asset.js')).default;
    const { userId, assignmentDate, notes } = req.body;

    if (!userId) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('User ID is required', 400));
    }

    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Asset not found', 404));
    }

    // Add to history
    if (!asset.history) {
      asset.history = [];
    }

    asset.history.push({
      action: 'assigned',
      assignedTo: userId,
      assignedBy: req.user._id,
      assignmentDate: assignmentDate || new Date(),
      notes
    });

    asset.assignedTo = userId;
    asset.status = 'assigned';
    await asset.save();

    const updatedAsset = await asset.populate('assignedTo', 'firstName lastName employeeId')
      .populate('history.assignedBy', 'firstName lastName')
      .populate('history.assignedTo', 'firstName lastName');

    res.status(200).json({
      status: 'success',
      message: 'Asset assigned successfully',
      data: { asset: updatedAsset }
    });
  } catch (error) {
    next(error);
  }
});

// Unassign asset from user
router.post('/:id/unassign', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Asset = (await import('../models/Asset.js')).default;
    const { returnDate, notes } = req.body;

    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Asset not found', 404));
    }

    if (!asset.assignedTo) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Asset is not currently assigned', 400));
    }

    // Add to history
    if (!asset.history) {
      asset.history = [];
    }

    asset.history.push({
      action: 'unassigned',
      assignedTo: asset.assignedTo,
      assignedBy: req.user._id,
      returnDate: returnDate || new Date(),
      notes
    });

    asset.assignedTo = null;
    asset.status = 'available';
    await asset.save();

    const updatedAsset = await asset.populate('assignedTo', 'firstName lastName employeeId')
      .populate('history.assignedBy', 'firstName lastName')
      .populate('history.assignedTo', 'firstName lastName');

    res.status(200).json({
      status: 'success',
      message: 'Asset unassigned successfully',
      data: { asset: updatedAsset }
    });
  } catch (error) {
    next(error);
  }
});

// Get asset history
router.get('/:id/history', async (req, res, next) => {
  try {
    const Asset = (await import('../models/Asset.js')).default;
    const asset = await Asset.findById(req.params.id)
      .populate('history.assignedBy', 'firstName lastName employeeId')
      .populate('history.assignedTo', 'firstName lastName employeeId');

    if (!asset) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Asset not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { history: asset.history || [] }
    });
  } catch (error) {
    next(error);
  }
});

// Mark asset as returned/maintenance
router.post('/:id/status', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Asset = (await import('../models/Asset.js')).default;
    const { status, notes } = req.body;

    if (!['available', 'assigned', 'maintenance', 'damaged', 'retired'].includes(status)) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Invalid status', 400));
    }

    const asset = await Asset.findByIdAndUpdate(
      req.params.id,
      { status, lastStatusUpdate: new Date() },
      { new: true }
    ).populate('assignedTo', 'firstName lastName employeeId');

    if (!asset) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Asset not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Asset status updated successfully',
      data: { asset }
    });
  } catch (error) {
    next(error);
  }
});

// Delete asset
router.delete('/:id', restrictTo('admin'), async (req, res, next) => {
  try {
    const Asset = (await import('../models/Asset.js')).default;
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Asset not found', 404));
    }

    await Asset.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
