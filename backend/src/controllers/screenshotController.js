import Screenshot from '../models/Screenshot.js';
import Attendance from '../models/Attendance.js';
import { uploadScreenshot, getSignedUrlForDownload } from '../services/s3Service.js';
import { AppError } from '../utils/appError.js';
import logger from '../utils/logger.js';

export const uploadScreenshotImage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { screenshotData, metadata } = req.body;

    if (!screenshotData) {
      return next(new AppError('Screenshot data is required', 400));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user: userId,
      date: today,
      'checkOut.time': { $exists: false }
    });

    if (!attendance) {
      return next(new AppError('No active attendance found. Please check in first.', 400));
    }

    if (attendance.status === 'break' || attendance.status === 'short_leave') {
      return next(new AppError('Screenshots are disabled during breaks and short leaves', 400));
    }

    const buffer = Buffer.from(screenshotData, 'base64');

    const timestamp = Date.now();
    const s3Key = await uploadScreenshot(buffer, userId, timestamp);

    const screenshot = await Screenshot.create({
      user: userId,
      attendance: attendance._id,
      captureTime: new Date(),
      s3Key,
      s3Bucket: process.env.S3_BUCKET_NAME,
      fileSize: buffer.length,
      isBlurred: metadata?.isBlurred || true,
      isCompressed: metadata?.isCompressed || true,
      metadata: {
        appTitle: metadata?.appTitle,
        screenResolution: metadata?.screenResolution,
        deviceInfo: metadata?.deviceInfo
      }
    });

    logger.info(`Screenshot uploaded for user ${userId}`);

    res.status(201).json({
      status: 'success',
      message: 'Screenshot uploaded successfully',
      data: { screenshot }
    });
  } catch (error) {
    logger.error('Screenshot upload error:', error);
    next(error);
  }
};

export const getMyScreenshots = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = { user: userId, isDeleted: false };

    if (startDate || endDate) {
      query.captureTime = {};
      if (startDate) query.captureTime.$gte = new Date(startDate);
      if (endDate) query.captureTime.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const screenshots = await Screenshot.find(query)
      .sort({ captureTime: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-s3Key');

    const total = await Screenshot.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        screenshots,
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

export const getUserScreenshots = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return next(new AppError('Access denied', 403));
    }

    const { userId } = req.params;
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = { user: userId, isDeleted: false };

    if (startDate || endDate) {
      query.captureTime = {};
      if (startDate) query.captureTime.$gte = new Date(startDate);
      if (endDate) query.captureTime.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const screenshots = await Screenshot.find(query)
      .sort({ captureTime: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('user', 'firstName lastName employeeId')
      .select('-s3Key');

    const total = await Screenshot.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        screenshots,
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

export const getScreenshotUrl = async (req, res, next) => {
  try {
    const { screenshotId } = req.params;

    const screenshot = await Screenshot.findById(screenshotId);

    if (!screenshot) {
      return next(new AppError('Screenshot not found', 404));
    }

    if (req.user.role !== 'admin' && req.user.role !== 'manager' && screenshot.user.toString() !== req.user._id.toString()) {
      return next(new AppError('You can only view your own screenshots', 403));
    }

    if (screenshot.isDeleted) {
      return next(new AppError('Screenshot has been deleted', 404));
    }

    const signedUrl = await getSignedUrlForDownload(screenshot.s3Key, screenshot.s3Bucket, 300);

    res.status(200).json({
      status: 'success',
      data: { url: signedUrl }
    });
  } catch (error) {
    next(error);
  }
};

export const checkScreenshotStatus = async (req, res, next) => {
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
      return res.status(200).json({
        status: 'success',
        data: {
          shouldCapture: false,
          reason: 'Not checked in'
        }
      });
    }

    if (attendance.status === 'break' || attendance.status === 'short_leave') {
      return res.status(200).json({
        status: 'success',
        data: {
          shouldCapture: false,
          reason: `User is on ${attendance.status.replace('_', ' ')}`
        }
      });
    }

    const minInterval = parseInt(process.env.SCREENSHOT_MIN_INTERVAL) || 20;
    const maxInterval = parseInt(process.env.SCREENSHOT_MAX_INTERVAL) || 30;
    const nextCaptureIn = Math.floor(Math.random() * (maxInterval - minInterval + 1) + minInterval);

    res.status(200).json({
      status: 'success',
      data: {
        shouldCapture: true,
        nextCaptureIn,
        attendanceId: attendance._id
      }
    });
  } catch (error) {
    next(error);
  }
};
