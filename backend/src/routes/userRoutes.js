import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { AVAILABLE_ROUTES, getDefaultRoutes } from '../config/routePermissions.js';

const router = express.Router();

router.use(protect);

router.get('/route-permissions/available', restrictTo('admin'), (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { routes: AVAILABLE_ROUTES }
  });
});

router.get('/', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const User = (await import('../models/User.js')).default;
    const { department, role, isActive, page = 1, limit = 20 } = req.query;

    const query = {};
    if (department) query.department = department;
    if (role) query.role = role;
    if (isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;
    const selectFields = req.user.role === 'admin' ? '-password' : '-password -salary';
    const users = await User.find(query)
      .select(selectFields)
      .populate('manager', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await User.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('manager', 'firstName lastName employeeId');

    if (!user) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', restrictTo('admin'), async (req, res, next) => {
  try {
    const User = (await import('../models/User.js')).default;
    const { password, ...updateData } = req.body;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/permissions', restrictTo('admin'), async (req, res, next) => {
  try {
    const User = (await import('../models/User.js')).default;
    const { allowedRoutes } = req.body;

    if (!Array.isArray(allowedRoutes)) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('allowedRoutes must be an array', 400));
    }

    const validRouteKeys = AVAILABLE_ROUTES.map(r => r.key);
    const invalidRoutes = allowedRoutes.filter(r => !validRouteKeys.includes(r));
    if (invalidRoutes.length > 0) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError(`Invalid routes: ${invalidRoutes.join(', ')}`, 400));
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { allowedRoutes },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', restrictTo('admin'), async (req, res, next) => {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({ status: 'success', message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
