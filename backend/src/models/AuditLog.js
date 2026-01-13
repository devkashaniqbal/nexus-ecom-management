import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        // Authentication
        'login',
        'logout',
        'login_failed',
        'password_changed',
        'password_reset',
        // User Management
        'user_created',
        'user_updated',
        'user_deleted',
        'role_changed',
        // Attendance
        'check_in',
        'check_out',
        'break_start',
        'break_end',
        // Projects & Timesheets
        'project_created',
        'project_updated',
        'project_deleted',
        'timesheet_submitted',
        'timesheet_approved',
        'timesheet_rejected',
        // Assets
        'asset_created',
        'asset_assigned',
        'asset_returned',
        'asset_deleted',
        // Expenses & Leaves
        'expense_submitted',
        'expense_approved',
        'expense_rejected',
        'leave_requested',
        'leave_approved',
        'leave_rejected',
        // Announcements
        'announcement_created',
        'announcement_updated',
        'announcement_deleted',
        // Data Access
        'data_exported',
        'report_generated',
        'file_uploaded',
        'file_downloaded',
        // AI Agent
        'knowledge_added',
        'knowledge_updated',
        'knowledge_deleted',
        'chat_session_started',
        // Security
        'suspicious_activity',
        'ip_blocked',
        'session_terminated',
      ],
    },
    resourceType: {
      type: String,
      enum: [
        'User',
        'Attendance',
        'Project',
        'Timesheet',
        'Asset',
        'Expense',
        'Leave',
        'Announcement',
        'KnowledgeBase',
        'ChatHistory',
        'Screenshot',
        'System',
      ],
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    location: {
      country: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'warning'],
      default: 'success',
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
