import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../utils/appError.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authorized. Please log in.', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new AppError('User no longer exists.', 401));
    }

    if (!user.isActive) {
      return next(new AppError('User account is deactivated.', 401));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired. Please log in again.', 401));
    }
    return next(new AppError('Authentication failed.', 401));
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};

export const isOwnerOrAdmin = (resourceKey = 'user') => {
  return (req, res, next) => {
    const resourceId = req.params[resourceKey] || req.body[resourceKey];

    if (req.user.role === 'admin' || req.user._id.toString() === resourceId) {
      return next();
    }

    return next(new AppError('You do not have permission to access this resource.', 403));
  };
};

export const isManagerOrAbove = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return next(new AppError('Manager or Admin access required.', 403));
};
