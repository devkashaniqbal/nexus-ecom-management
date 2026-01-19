import roleService from '../services/roleService.js';
import RoleHistory from '../models/RoleHistory.js';
import User from '../models/User.js';

export const changeRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newRole, reason, effectiveDate, handoverTo } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Only admins can change roles' });
    }

    const roleHistory = await roleService.changeRole(userId, newRole, req.user, {
      reason,
      effectiveDate,
      handoverTo,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ status: 'success', data: { roleHistory } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const changeManager = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newManagerId, reason, effectiveDate } = req.body;

    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    const roleHistory = await roleService.changeManager(userId, newManagerId, req.user, {
      reason,
      effectiveDate
    });

    res.json({ status: 'success', data: { roleHistory } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const changeDepartment = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newDepartment, reason, effectiveDate } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Only admins can change departments' });
    }

    const roleHistory = await roleService.changeDepartment(userId, newDepartment, req.user, {
      reason,
      effectiveDate
    });

    res.json({ status: 'success', data: { roleHistory } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const changeDesignation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newDesignation, reason, effectiveDate, isPromotion } = req.body;

    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    const roleHistory = await roleService.changeDesignation(userId, newDesignation, req.user, {
      reason,
      effectiveDate,
      isPromotion
    });

    res.json({ status: 'success', data: { roleHistory } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const promoteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newRole, newDesignation, reason, effectiveDate, handoverTo } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Only admins can promote users' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const results = [];

    if (newRole && newRole !== user.role) {
      const roleHistory = await roleService.changeRole(userId, newRole, req.user, {
        reason,
        effectiveDate,
        handoverTo,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      results.push(roleHistory);
    }

    if (newDesignation && newDesignation !== user.designation) {
      const designationHistory = await roleService.changeDesignation(userId, newDesignation, req.user, {
        reason,
        effectiveDate,
        isPromotion: true
      });
      results.push(designationHistory);
    }

    res.json({ status: 'success', data: { changes: results } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getUserRoleHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { changeType, startDate, endDate } = req.query;

    if (req.user._id.toString() !== userId && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    const history = await roleService.getUserRoleHistory(userId, {
      changeType,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    });

    res.json({ status: 'success', data: { history } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getMyRoleHistory = async (req, res) => {
  try {
    const history = await roleService.getUserRoleHistory(req.user._id);
    res.json({ status: 'success', data: { history } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getPendingHandovers = async (req, res) => {
  try {
    const handovers = await roleService.getPendingHandovers(req.user._id);
    res.json({ status: 'success', data: { handovers } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const completeHandover = async (req, res) => {
  try {
    const { roleHistoryId } = req.params;
    const { notes } = req.body;

    const roleHistory = await RoleHistory.findById(roleHistoryId);
    if (!roleHistory) {
      return res.status(404).json({ status: 'error', message: 'Handover not found' });
    }

    if (roleHistory.handover.handoverTo?.toString() !== req.user._id.toString() &&
        roleHistory.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    if (notes) roleHistory.handover.notes = notes;

    const completed = await roleService.completeHandover(roleHistoryId, req.user);

    res.json({ status: 'success', data: { roleHistory: completed } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateHandoverTask = async (req, res) => {
  try {
    const { roleHistoryId, taskIndex } = req.params;
    const { isCompleted } = req.body;

    const roleHistory = await RoleHistory.findById(roleHistoryId);
    if (!roleHistory) {
      return res.status(404).json({ status: 'error', message: 'Handover not found' });
    }

    if (roleHistory.handover.tasks[taskIndex]) {
      roleHistory.handover.tasks[taskIndex].isCompleted = isCompleted;
      if (isCompleted) {
        roleHistory.handover.tasks[taskIndex].completedAt = new Date();
      }
      await roleHistory.save();
    }

    res.json({ status: 'success', data: { roleHistory } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getAllRoleChanges = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Only admins can view all role changes' });
    }

    const { page = 1, limit = 20, changeType, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (changeType) query.changeType = changeType;
    if (startDate || endDate) {
      query.effectiveDate = {};
      if (startDate) query.effectiveDate.$gte = new Date(startDate);
      if (endDate) query.effectiveDate.$lte = new Date(endDate);
    }

    const changes = await RoleHistory.find(query)
      .populate('user', 'firstName lastName email employeeId')
      .populate('changedBy', 'firstName lastName')
      .sort({ effectiveDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await RoleHistory.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        changes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
