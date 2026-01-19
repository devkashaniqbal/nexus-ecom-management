import User from '../models/User.js';
import RoleHistory from '../models/RoleHistory.js';
import Task from '../models/Task.js';
import Workspace from '../models/Workspace.js';
import Space from '../models/Space.js';
import Team from '../models/Team.js';
import notificationService from './notificationService.js';
import socketService from './socketService.js';
import logger from '../utils/logger.js';

class RoleService {
  async changeRole(userId, newRole, changedBy, options = {}) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const previousRole = user.role;
    const isPromotion = this.isPromotion(previousRole, newRole);
    const isDemotion = this.isDemotion(previousRole, newRole);

    const roleHistory = await RoleHistory.logChange({
      user: userId,
      changeType: isPromotion ? 'promotion' : isDemotion ? 'demotion' : 'role_change',
      previousValue: { role: previousRole },
      newValue: { role: newRole },
      changedBy: changedBy._id,
      reason: options.reason,
      effectiveDate: options.effectiveDate || new Date(),
      handover: {
        isRequired: isPromotion || isDemotion,
        status: 'pending',
        handoverTo: options.handoverTo
      },
      ipAddress: options.ipAddress,
      userAgent: options.userAgent
    });

    user.role = newRole;
    await user.save();

    await this.updatePermissionsOnRoleChange(user, previousRole, newRole);

    if (isPromotion || isDemotion) {
      await this.updateProjectAssignments(user, previousRole, newRole);
      await this.updateWorkspaceRoles(user, newRole);
    }

    await notificationService.notifyRoleChanged(user, roleHistory, changedBy);

    if (options.handoverTo) {
      const handoverTasks = await this.getHandoverTasks(userId);
      const handoverUser = await User.findById(options.handoverTo);
      await notificationService.notifyHandoverRequired(user, handoverUser, handoverTasks);
    }

    await this.notifyAffectedTeamMembers(user, roleHistory);

    socketService.emitToUser(userId, 'role:changed', {
      previousRole,
      newRole,
      changeType: roleHistory.changeType
    });

    logger.info(`Role changed for user ${userId}: ${previousRole} -> ${newRole} by ${changedBy._id}`);
    return roleHistory;
  }

  async changeManager(userId, newManagerId, changedBy, options = {}) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const previousManager = user.manager;

    const roleHistory = await RoleHistory.logChange({
      user: userId,
      changeType: 'manager_change',
      previousValue: { manager: previousManager },
      newValue: { manager: newManagerId },
      changedBy: changedBy._id,
      reason: options.reason,
      effectiveDate: options.effectiveDate || new Date(),
      handover: {
        isRequired: true,
        status: 'pending',
        handoverTo: newManagerId
      }
    });

    user.manager = newManagerId;
    await user.save();

    await this.reassignApprovals(userId, previousManager, newManagerId);

    await notificationService.notifyRoleChanged(user, roleHistory, changedBy);

    if (previousManager) {
      const oldManager = await User.findById(previousManager);
      if (oldManager) {
        await notificationService.create({
          recipient: previousManager,
          sender: changedBy._id,
          type: 'manager_changed',
          title: 'Team Member Reassigned',
          message: `${user.firstName} ${user.lastName} has been reassigned to a new manager`,
          priority: 'normal',
          channels: { inApp: true, email: false }
        });
      }
    }

    if (newManagerId) {
      await notificationService.create({
        recipient: newManagerId,
        sender: changedBy._id,
        type: 'team_added',
        title: 'New Team Member',
        message: `${user.firstName} ${user.lastName} has been assigned to your team`,
        priority: 'normal',
        channels: { inApp: true, email: true }
      });
    }

    return roleHistory;
  }

  async changeDepartment(userId, newDepartment, changedBy, options = {}) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const previousDepartment = user.department;

    const roleHistory = await RoleHistory.logChange({
      user: userId,
      changeType: 'department_change',
      previousValue: { department: previousDepartment },
      newValue: { department: newDepartment },
      changedBy: changedBy._id,
      reason: options.reason,
      effectiveDate: options.effectiveDate || new Date()
    });

    user.department = newDepartment;
    await user.save();

    await notificationService.notifyRoleChanged(user, roleHistory, changedBy);

    return roleHistory;
  }

  async changeDesignation(userId, newDesignation, changedBy, options = {}) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const previousDesignation = user.designation;
    const isPromotion = options.isPromotion || false;

    const roleHistory = await RoleHistory.logChange({
      user: userId,
      changeType: isPromotion ? 'promotion' : 'designation_change',
      previousValue: { designation: previousDesignation },
      newValue: { designation: newDesignation },
      changedBy: changedBy._id,
      reason: options.reason,
      effectiveDate: options.effectiveDate || new Date()
    });

    user.designation = newDesignation;
    await user.save();

    await notificationService.notifyRoleChanged(user, roleHistory, changedBy);

    return roleHistory;
  }

  async updateWorkspaceRole(userId, workspaceId, newRole, changedBy, options = {}) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    const memberIndex = workspace.members.findIndex(m => m.user.toString() === userId.toString());
    if (memberIndex === -1) throw new Error('User is not a member of this workspace');

    const previousRole = workspace.members[memberIndex].role;

    const roleHistory = await RoleHistory.logChange({
      user: userId,
      workspace: workspaceId,
      changeType: 'workspace_role_change',
      previousValue: { workspaceRole: previousRole },
      newValue: { workspaceRole: newRole },
      changedBy: changedBy._id,
      reason: options.reason,
      relatedResource: { type: 'Workspace', id: workspaceId }
    });

    workspace.members[memberIndex].role = newRole;
    this.updateMemberPermissions(workspace.members[memberIndex], newRole);
    await workspace.save();

    const user = await User.findById(userId);
    await notificationService.notifyRoleChanged(user, roleHistory, changedBy);

    socketService.emitToWorkspace(workspaceId, 'member:roleChanged', {
      userId,
      previousRole,
      newRole
    });

    return roleHistory;
  }

  updateMemberPermissions(member, role) {
    const permissions = {
      owner: {
        canCreateSpaces: true,
        canManageMembers: true,
        canDeleteWorkspace: true,
        canManageSettings: true,
        canViewAllSpaces: true,
        canExportData: true
      },
      admin: {
        canCreateSpaces: true,
        canManageMembers: true,
        canDeleteWorkspace: false,
        canManageSettings: true,
        canViewAllSpaces: true,
        canExportData: true
      },
      member: {
        canCreateSpaces: false,
        canManageMembers: false,
        canDeleteWorkspace: false,
        canManageSettings: false,
        canViewAllSpaces: true,
        canExportData: false
      },
      guest: {
        canCreateSpaces: false,
        canManageMembers: false,
        canDeleteWorkspace: false,
        canManageSettings: false,
        canViewAllSpaces: false,
        canExportData: false
      }
    };

    member.permissions = permissions[role] || permissions.member;
  }

  isPromotion(oldRole, newRole) {
    const hierarchy = { employee: 1, manager: 2, admin: 3 };
    return (hierarchy[newRole] || 0) > (hierarchy[oldRole] || 0);
  }

  isDemotion(oldRole, newRole) {
    const hierarchy = { employee: 1, manager: 2, admin: 3 };
    return (hierarchy[newRole] || 0) < (hierarchy[oldRole] || 0);
  }

  async updatePermissionsOnRoleChange(user, previousRole, newRole) {
    if (newRole === 'manager' || newRole === 'admin') {
      await Workspace.updateMany(
        { 'members.user': user._id, 'members.role': 'member' },
        {
          $set: {
            'members.$.permissions.canCreateSpaces': true,
            'members.$.permissions.canManageMembers': newRole === 'admin'
          }
        }
      );
    } else if (previousRole === 'manager' || previousRole === 'admin') {
      await Workspace.updateMany(
        { 'members.user': user._id },
        {
          $set: {
            'members.$.permissions.canCreateSpaces': false,
            'members.$.permissions.canManageMembers': false
          }
        }
      );
    }
  }

  async updateProjectAssignments(user, previousRole, newRole) {
    if (newRole === 'manager') {
      await Task.updateMany(
        { 'assignees.user': user._id, 'status.isClosed': false },
        {}
      );
    }
  }

  async updateWorkspaceRoles(user, newRole) {
    const workspaceRole = newRole === 'admin' ? 'admin' : newRole === 'manager' ? 'member' : 'member';

    await Workspace.updateMany(
      { 'members.user': user._id },
      { $set: { 'members.$.role': workspaceRole } }
    );
  }

  async reassignApprovals(userId, oldManagerId, newManagerId) {
    // This would update pending approvals
    logger.info(`Reassigning approvals from ${oldManagerId} to ${newManagerId} for user ${userId}`);
  }

  async getHandoverTasks(userId) {
    const tasks = await Task.find({
      'assignees.user': userId,
      'status.isClosed': false
    }).select('title status dueDate').limit(20);

    return tasks.map(t => ({
      id: t._id,
      description: t.title,
      dueDate: t.dueDate,
      status: t.status.name
    }));
  }

  async notifyAffectedTeamMembers(user, roleHistory) {
    const teamMembers = await User.find({ manager: user._id }).select('_id');

    if (teamMembers.length > 0) {
      await notificationService.createBulk(
        teamMembers.map(m => m._id),
        {
          sender: roleHistory.changedBy,
          type: 'manager_changed',
          title: 'Manager Role Changed',
          message: `Your manager ${user.firstName} ${user.lastName}'s role has been updated`,
          priority: 'normal',
          channels: { inApp: true, email: false }
        }
      );
    }
  }

  async completeHandover(roleHistoryId, completedBy) {
    const roleHistory = await RoleHistory.findById(roleHistoryId);
    if (!roleHistory) throw new Error('Role history record not found');

    roleHistory.handover.status = 'completed';
    roleHistory.handover.completedAt = new Date();
    await roleHistory.save();

    const user = await User.findById(roleHistory.user);
    await notificationService.create({
      recipient: roleHistory.user,
      sender: completedBy._id,
      type: 'handover_completed',
      title: 'Handover Completed',
      message: 'Your handover process has been completed',
      priority: 'normal',
      channels: { inApp: true, email: true }
    });

    return roleHistory;
  }

  async getUserRoleHistory(userId, options = {}) {
    return RoleHistory.getUserHistory(userId, options);
  }

  async getPendingHandovers(userId) {
    return RoleHistory.find({
      $or: [
        { user: userId, 'handover.status': 'pending' },
        { 'handover.handoverTo': userId, 'handover.status': 'pending' }
      ]
    }).populate('user', 'firstName lastName email').populate('changedBy', 'firstName lastName');
  }
}

const roleService = new RoleService();
export default roleService;
