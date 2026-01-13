import express from 'express';
import { protect, restrictTo, isManagerOrAbove } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Get user dashboard stats
router.get('/user/stats', async (req, res, next) => {
  try {
    const User = (await import('../models/User.js')).default;
    const Timesheet = (await import('../models/Timesheet.js')).default;
    const Leave = (await import('../models/Leave.js')).default;
    const Expense = (await import('../models/Expense.js')).default;
    const Announcement = (await import('../models/Announcement.js')).default;
    const Asset = (await import('../models/Asset.js')).default;

    const userId = req.user._id;

    // Get timesheets stats
    const timesheetStats = await Timesheet.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: '$totalHours' }
        }
      }
    ]);

    // Get leave stats
    const leaveStats = await Leave.aggregate([
      { $match: { employee: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          days: { $sum: '$days' }
        }
      }
    ]);

    // Get expense stats
    const expenseStats = await Expense.aggregate([
      { $match: { submittedBy: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Get unread announcements
    const unreadAnnouncements = await Announcement.countDocuments({
      isActive: true,
      $or: [
        { readBy: { $nin: [userId] } },
        { readBy: { $exists: false } }
      ]
    });

    // Get assigned assets
    const assignedAssets = await Asset.countDocuments({ assignedTo: userId });

    res.status(200).json({
      status: 'success',
      data: {
        timesheetStats,
        leaveStats,
        expenseStats,
        unreadAnnouncements,
        assignedAssets
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get manager/admin dashboard
router.get('/manager/stats', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const User = (await import('../models/User.js')).default;
    const Timesheet = (await import('../models/Timesheet.js')).default;
    const Leave = (await import('../models/Leave.js')).default;
    const Expense = (await import('../models/Expense.js')).default;
    const Project = (await import('../models/Project.js')).default;
    const Asset = (await import('../models/Asset.js')).default;

    // Get pending approvals count
    const pendingTimesheets = await Timesheet.countDocuments({ status: 'submitted' });
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
    const pendingExpenses = await Expense.countDocuments({ status: 'pending' });

    // Get total stats
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalProjects = await Project.countDocuments({ status: { $ne: 'archived' } });
    const totalAssets = await Asset.countDocuments();

    // Get recent timesheets
    const recentTimesheets = await Timesheet.find({ status: 'submitted' })
      .populate('user', 'firstName lastName employeeId')
      .sort({ submittedAt: -1 })
      .limit(5);

    // Get recent leaves
    const recentLeaves = await Leave.find({ status: 'pending' })
      .populate('employee', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent expenses
    const recentExpenses = await Expense.find({ status: 'pending' })
      .populate('submittedBy', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get approval stats
    const expenseStats = await Expense.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        pendingApprovals: {
          timesheets: pendingTimesheets,
          leaves: pendingLeaves,
          expenses: pendingExpenses
        },
        totals: {
          users: totalUsers,
          projects: totalProjects,
          assets: totalAssets
        },
        recentItems: {
          timesheets: recentTimesheets,
          leaves: recentLeaves,
          expenses: recentExpenses
        },
        expenseStats
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get admin dashboard
router.get('/admin/stats', restrictTo('admin'), async (req, res, next) => {
  try {
    const User = (await import('../models/User.js')).default;
    const Timesheet = (await import('../models/Timesheet.js')).default;
    const Leave = (await import('../models/Leave.js')).default;
    const Expense = (await import('../models/Expense.js')).default;
    const Project = (await import('../models/Project.js')).default;
    const Asset = (await import('../models/Asset.js')).default;
    const Announcement = (await import('../models/Announcement.js')).default;

    // Get user stats
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const usersByDepartment = await User.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    // Get project stats
    const totalProjects = await Project.countDocuments();
    const activeProjects = await Project.countDocuments({ status: { $ne: 'archived' } });
    const projectsByStatus = await Project.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get timesheet stats
    const timesheetStats = await Timesheet.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: '$totalHours' }
        }
      }
    ]);

    // Get leave stats
    const leaveStats = await Leave.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDays: { $sum: '$days' }
        }
      }
    ]);

    // Get leave by type
    const leaveByType = await Leave.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$leaveType', count: { $sum: 1 }, days: { $sum: '$days' } } }
    ]);

    // Get expense stats
    const expenseStats = await Expense.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Get expense by category
    const expenseByCategory = await Expense.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
    ]);

    // Get asset stats
    const totalAssets = await Asset.countDocuments();
    const assetsByStatus = await Asset.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const assetsByCategory = await Asset.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Get announcement stats
    const totalAnnouncements = await Announcement.countDocuments({ isActive: true });
    const announcementsByCategory = await Announcement.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Get pending approvals
    const pendingTimesheets = await Timesheet.countDocuments({ status: 'submitted' });
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
    const pendingExpenses = await Expense.countDocuments({ status: 'pending' });

    // Get recent activity
    const recentTimesheets = await Timesheet.find()
      .populate('user', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentLeaves = await Leave.find()
      .populate('employee', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentExpenses = await Expense.find()
      .populate('submittedBy', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      status: 'success',
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          byRole: usersByRole,
          byDepartment: usersByDepartment
        },
        projects: {
          total: totalProjects,
          active: activeProjects,
          byStatus: projectsByStatus
        },
        timesheets: timesheetStats,
        leaves: {
          stats: leaveStats,
          byType: leaveByType
        },
        expenses: {
          stats: expenseStats,
          byCategory: expenseByCategory
        },
        assets: {
          total: totalAssets,
          byStatus: assetsByStatus,
          byCategory: assetsByCategory
        },
        announcements: {
          total: totalAnnouncements,
          byCategory: announcementsByCategory
        },
        pendingApprovals: {
          timesheets: pendingTimesheets,
          leaves: pendingLeaves,
          expenses: pendingExpenses
        },
        recentActivity: {
          timesheets: recentTimesheets,
          leaves: recentLeaves,
          expenses: recentExpenses
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get timesheet analytics
router.get('/analytics/timesheets', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Timesheet = (await import('../models/Timesheet.js')).default;
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.weekStartDate = {};
      if (startDate) query.weekStartDate.$gte = new Date(startDate);
      if (endDate) query.weekStartDate.$lte = new Date(endDate);
    }

    const timesheets = await Timesheet.aggregate([
      { $match: query },
      {
        $group: {
          _id: { status: '$status', week: { $week: '$weekStartDate' } },
          count: { $sum: 1 },
          totalHours: { $sum: '$totalHours' }
        }
      },
      { $sort: { '_id.week': -1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: { timesheets }
    });
  } catch (error) {
    next(error);
  }
});

// Get expense analytics
router.get('/analytics/expenses', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Expense = (await import('../models/Expense.js')).default;
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: { status: '$status', category: '$category' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Get daily expense summary
    const dailyExpenses = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        expenses,
        dailyExpenses
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get leave analytics
router.get('/analytics/leaves', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Leave = (await import('../models/Leave.js')).default;
    const { year } = req.query;

    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const leaveAnalytics = await Leave.aggregate([
      {
        $match: {
          startDate: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: '$leaveType',
          approved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, '$days', 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$days', 0]
            }
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ['$status', 'rejected'] }, '$days', 0]
            }
          },
          cancelled: {
            $sum: {
              $cond: [{ $eq: ['$status', 'cancelled'] }, '$days', 0]
            }
          }
        }
      }
    ]);

    // Get monthly leave breakdown
    const monthlyLeaves = await Leave.aggregate([
      {
        $match: {
          status: 'approved',
          startDate: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$startDate' },
          days: { $sum: '$days' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        leaveAnalytics,
        monthlyLeaves
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
