import Attendance from '../models/Attendance.js';
import { AppError } from '../utils/appError.js';
import logger from '../utils/logger.js';

export const checkIn = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { location } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await Attendance.findOne({
      user: userId,
      date: today
    });

    if (existingAttendance) {
      return next(new AppError('You have already checked in today', 400));
    }

    const attendance = await Attendance.create({
      user: userId,
      date: today,
      checkIn: {
        time: new Date(),
        ip,
        location
      },
      status: 'working'
    });

    logger.info(`User ${userId} checked in`);

    res.status(201).json({
      status: 'success',
      message: 'Checked in successfully',
      data: { attendance }
    });
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { location } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user: userId,
      date: today,
      'checkOut.time': { $exists: false }
    });

    if (!attendance) {
      return next(new AppError('No active check-in found for today', 400));
    }

    if (attendance.status === 'break' || attendance.status === 'short_leave') {
      const lastBreak = attendance.breaks[attendance.breaks.length - 1];
      if (lastBreak && !lastBreak.endTime) {
        lastBreak.endTime = new Date();
        lastBreak.duration = (lastBreak.endTime - lastBreak.startTime) / (1000 * 60);
      }
    }

    attendance.checkOut = {
      time: new Date(),
      ip,
      location
    };
    attendance.status = 'checked_out';

    await attendance.save();

    logger.info(`User ${userId} checked out`);

    res.status(200).json({
      status: 'success',
      message: 'Checked out successfully',
      data: { attendance }
    });
  } catch (error) {
    next(error);
  }
};

export const startBreak = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { type = 'break', reason } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user: userId,
      date: today,
      'checkOut.time': { $exists: false }
    });

    if (!attendance) {
      return next(new AppError('Please check in first', 400));
    }

    if (attendance.status === 'break' || attendance.status === 'short_leave') {
      return next(new AppError('You are already on a break', 400));
    }

    attendance.breaks.push({
      startTime: new Date(),
      type,
      reason,
      approvalStatus: type === 'short_leave' ? 'pending' : 'approved'
    });

    attendance.status = type;

    await attendance.save();

    logger.info(`User ${userId} started ${type}`);

    res.status(200).json({
      status: 'success',
      message: `${type === 'break' ? 'Break' : 'Short leave'} started successfully`,
      data: { attendance }
    });
  } catch (error) {
    next(error);
  }
};

export const endBreak = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user: userId,
      date: today,
      'checkOut.time': { $exists: false }
    });

    if (!attendance) {
      return next(new AppError('No active attendance found', 400));
    }

    if (attendance.status !== 'break' && attendance.status !== 'short_leave') {
      return next(new AppError('You are not on a break', 400));
    }

    const lastBreak = attendance.breaks[attendance.breaks.length - 1];

    if (!lastBreak || lastBreak.endTime) {
      return next(new AppError('No active break found', 400));
    }

    lastBreak.endTime = new Date();
    lastBreak.duration = (lastBreak.endTime - lastBreak.startTime) / (1000 * 60);

    attendance.status = 'working';

    await attendance.save();

    logger.info(`User ${userId} ended break`);

    res.status(200).json({
      status: 'success',
      message: 'Break ended successfully',
      data: { attendance }
    });
  } catch (error) {
    next(error);
  }
};

export const getTodayAttendance = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user: userId,
      date: today
    }).populate('user', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      data: { attendance }
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceHistory = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user._id;
    const { startDate, endDate, page = 1, limit = 30 } = req.query;

    if (req.user.role !== 'admin' && req.user.role !== 'manager' && userId.toString() !== req.user._id.toString()) {
      return next(new AppError('You can only view your own attendance', 403));
    }

    const query = { user: userId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('user', 'firstName lastName employeeId');

    const total = await Attendance.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        attendance,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceSummary = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user._id;
    const { month, year } = req.query;

    if (req.user.role !== 'admin' && req.user.role !== 'manager' && userId.toString() !== req.user._id.toString()) {
      return next(new AppError('You can only view your own attendance', 403));
    }

    const targetDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()), 1);
    const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    const attendance = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    });

    const totalDays = attendance.length;
    const totalWorkHours = attendance.reduce((sum, att) => sum + att.totalWorkHours, 0);
    const totalBreakHours = attendance.reduce((sum, att) => sum + att.totalBreakHours, 0);
    const lateDays = attendance.filter(att => att.isLate).length;

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalDays,
          totalWorkHours: totalWorkHours.toFixed(2),
          totalBreakHours: totalBreakHours.toFixed(2),
          lateDays,
          averageWorkHours: (totalWorkHours / totalDays).toFixed(2)
        },
        attendance
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllTodayAttendance = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return next(new AppError('Access denied', 403));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.find({ date: today })
      .populate('user', 'firstName lastName employeeId department')
      .sort({ 'checkIn.time': -1 });

    res.status(200).json({
      status: 'success',
      data: { attendance }
    });
  } catch (error) {
    next(error);
  }
};
