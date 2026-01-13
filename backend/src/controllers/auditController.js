import { getAuditLogs } from '../utils/auditLogger.js';
import AuditLog from '../models/AuditLog.js';
import { AppError } from '../utils/appError.js';

export const getAllAuditLogs = async (req, res, next) => {
  try {
    const {
      userId,
      action,
      resourceType,
      startDate,
      endDate,
      severity,
      limit = 50,
      skip = 0,
    } = req.query;

    const { logs, total } = await getAuditLogs({
      userId,
      action,
      resourceType,
      startDate,
      endDate,
      severity,
      limit,
      skip,
    });

    res.status(200).json({
      status: 'success',
      data: {
        logs,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserAuditLogs = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Check if user has permission to view other users' logs
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'manager' &&
      userId !== req.user._id.toString()
    ) {
      return next(new AppError('You do not have permission to view these logs', 403));
    }

    const { logs, total } = await getAuditLogs({
      userId,
      limit,
      skip,
    });

    res.status(200).json({
      status: 'success',
      data: {
        logs,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Total logs
    const totalLogs = await AuditLog.countDocuments(dateFilter);

    // Logs by action
    const logsByAction = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Logs by severity
    const logsBySeverity = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);

    // Most active users
    const mostActiveUsers = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          count: 1,
          name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          email: '$user.email',
        },
      },
    ]);

    // Failed actions
    const failedActions = await AuditLog.countDocuments({
      ...dateFilter,
      status: 'failed',
    });

    // Security events
    const securityEvents = await AuditLog.countDocuments({
      ...dateFilter,
      severity: 'critical',
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalLogs,
        failedActions,
        securityEvents,
        logsByAction,
        logsBySeverity,
        mostActiveUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const exportAuditLogs = async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    const { logs } = await getAuditLogs({
      startDate,
      endDate,
      limit: 10000, // Max export limit
    });

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertLogsToCSV(logs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=audit-logs-${new Date().toISOString()}.csv`
      );
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=audit-logs-${new Date().toISOString()}.json`
      );
      res.send(JSON.stringify(logs, null, 2));
    }
  } catch (error) {
    next(error);
  }
};

const convertLogsToCSV = (logs) => {
  const headers = [
    'Date',
    'User',
    'Action',
    'Resource Type',
    'Status',
    'Severity',
    'IP Address',
  ];

  const rows = logs.map((log) => [
    new Date(log.createdAt).toISOString(),
    log.userId
      ? `${log.userId.firstName} ${log.userId.lastName} (${log.userId.email})`
      : 'System',
    log.action,
    log.resourceType || 'N/A',
    log.status,
    log.severity,
    log.ipAddress || 'N/A',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
};
