import AuditLog from '../models/AuditLog.js';

/**
 * Create an audit log entry
 * @param {Object} logData - The audit log data
 * @param {String} logData.userId - User ID performing the action
 * @param {String} logData.action - Action being performed
 * @param {String} logData.resourceType - Type of resource
 * @param {String} logData.resourceId - ID of the resource
 * @param {Object} logData.details - Additional details
 * @param {Object} logData.changes - Before/after changes
 * @param {Object} logData.req - Express request object
 * @param {String} logData.status - Status of the action
 * @param {String} logData.severity - Severity level
 */
export const createAuditLog = async (logData) => {
  try {
    const {
      userId,
      action,
      resourceType,
      resourceId,
      details,
      changes,
      req,
      status = 'success',
      severity = 'low',
      metadata,
    } = logData;

    const auditEntry = {
      userId,
      action,
      resourceType,
      resourceId,
      details,
      changes,
      status,
      severity,
      metadata,
    };

    // Extract request information if available
    if (req) {
      auditEntry.ipAddress = req.ip || req.connection?.remoteAddress;
      auditEntry.userAgent = req.get('user-agent');

      // You can add geolocation lookup here if needed
      // const location = await getLocationFromIP(auditEntry.ipAddress);
      // auditEntry.location = location;
    }

    await AuditLog.create(auditEntry);
  } catch (error) {
    // Don't throw error to prevent audit logging from breaking the main flow
    console.error('Audit logging failed:', error);
  }
};

/**
 * Middleware to automatically log certain actions
 */
export const auditMiddleware = (action, resourceType) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send function to capture response
    res.send = function (data) {
      // Only log successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        createAuditLog({
          userId: req.user?._id,
          action,
          resourceType,
          resourceId: req.params?.id,
          details: {
            method: req.method,
            path: req.path,
            query: req.query,
            body: sanitizeBody(req.body),
          },
          req,
          status: 'success',
        });
      }

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Remove sensitive data from request body before logging
 */
const sanitizeBody = (body) => {
  if (!body) return {};

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });

  return sanitized;
};

/**
 * Log security events with high severity
 */
export const logSecurityEvent = async (data) => {
  return createAuditLog({
    ...data,
    severity: 'critical',
    status: 'warning',
  });
};

/**
 * Get audit logs with filters
 */
export const getAuditLogs = async (filters = {}, options = {}) => {
  const {
    userId,
    action,
    resourceType,
    startDate,
    endDate,
    severity,
    limit = 100,
    skip = 0,
  } = { ...filters, ...options };

  const query = {};

  if (userId) query.userId = userId;
  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;
  if (severity) query.severity = severity;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip))
    .populate('userId', 'firstName lastName email role');

  const total = await AuditLog.countDocuments(query);

  return { logs, total };
};

export default {
  createAuditLog,
  auditMiddleware,
  logSecurityEvent,
  getAuditLogs,
};
