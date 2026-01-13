import User from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { generateToken } from '../utils/jwt.js';
import logger from '../utils/logger.js';
import { createAuditLog, logSecurityEvent } from '../utils/auditLogger.js';

export const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role, employeeId, department, designation, dateOfJoining } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (existingUser) {
      return next(new AppError('User with this email or employee ID already exists', 400));
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || 'employee',
      employeeId,
      department,
      designation,
      dateOfJoining: dateOfJoining || Date.now()
    });

    const token = generateToken(user._id);

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: user.toSafeObject(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      // Log failed login attempt
      if (user) {
        await logSecurityEvent({
          userId: user._id,
          action: 'login_failed',
          resourceType: 'User',
          details: { email, reason: 'Invalid password' },
          req,
          status: 'failed',
        });
      }
      return next(new AppError('Invalid email or password', 401));
    }

    if (!user.isActive) {
      await logSecurityEvent({
        userId: user._id,
        action: 'login_failed',
        resourceType: 'User',
        details: { email, reason: 'Account deactivated' },
        req,
        status: 'failed',
      });
      return next(new AppError('Your account has been deactivated', 401));
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    // Log successful login
    await createAuditLog({
      userId: user._id,
      action: 'login',
      resourceType: 'User',
      details: { email },
      req,
      status: 'success',
      severity: 'low',
    });

    logger.info(`User logged in: ${email}`);

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: user.toSafeObject(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('manager', 'firstName lastName email employeeId');

    res.status(200).json({
      status: 'success',
      data: {
        user: user.toSafeObject()
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new AppError('Please provide current and new password', 400));
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return next(new AppError('Current password is incorrect', 401));
    }

    user.password = newPassword;
    await user.save();

    const token = generateToken(user._id);

    logger.info(`Password updated for user: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully',
      data: { token }
    });
  } catch (error) {
    next(error);
  }
};
