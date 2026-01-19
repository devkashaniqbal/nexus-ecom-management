import Workspace from '../models/Workspace.js';
import Space from '../models/Space.js';
import List from '../models/List.js';
import Task from '../models/Task.js';
import Team from '../models/Team.js';
import logger from '../utils/logger.js';

class PermissionService {
  constructor() {
    this.permissionCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000;
  }

  getCacheKey(userId, resourceType, resourceId) {
    return `${userId}:${resourceType}:${resourceId}`;
  }

  getFromCache(key) {
    const cached = this.permissionCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.permissions;
    }
    this.permissionCache.delete(key);
    return null;
  }

  setCache(key, permissions) {
    this.permissionCache.set(key, { permissions, timestamp: Date.now() });
  }

  clearUserCache(userId) {
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.permissionCache.delete(key);
      }
    }
  }

  async checkWorkspacePermission(userId, workspaceId, permission) {
    const cacheKey = this.getCacheKey(userId, 'Workspace', workspaceId);
    let permissions = this.getFromCache(cacheKey);

    if (!permissions) {
      const workspace = await Workspace.findById(workspaceId).select('members owner');
      if (!workspace) return false;

      if (workspace.owner.toString() === userId.toString()) {
        permissions = this.getOwnerPermissions();
      } else {
        const member = workspace.members.find(m => m.user.toString() === userId.toString());
        if (!member) return false;
        permissions = this.getMemberPermissions(member);
      }
      this.setCache(cacheKey, permissions);
    }

    return permissions[permission] === true;
  }

  async checkSpacePermission(userId, spaceId, permission) {
    const space = await Space.findById(spaceId).select('workspace members isPrivate');
    if (!space) return false;

    const hasWorkspaceAccess = await this.checkWorkspacePermission(userId, space.workspace, 'canViewAllSpaces');

    if (space.isPrivate) {
      const member = space.members.find(m => m.user.toString() === userId.toString());
      if (!member) return false;

      const spacePermissions = this.getSpaceMemberPermissions(member);
      return spacePermissions[permission] === true;
    }

    if (hasWorkspaceAccess) {
      const member = space.members.find(m => m.user.toString() === userId.toString());
      if (member) {
        const spacePermissions = this.getSpaceMemberPermissions(member);
        return spacePermissions[permission] === true;
      }
      return ['canView', 'canViewTasks'].includes(permission);
    }

    return false;
  }

  async checkListPermission(userId, listId, permission) {
    const list = await List.findById(listId).select('space workspace');
    if (!list) return false;

    return this.checkSpacePermission(userId, list.space, permission);
  }

  async checkTaskPermission(userId, taskId, permission) {
    const task = await Task.findById(taskId).select('list space workspace creator assignees');
    if (!task) return false;

    if (task.creator.toString() === userId.toString()) {
      return true;
    }

    if (task.assignees.some(a => a.user.toString() === userId.toString())) {
      if (['canView', 'canEdit', 'canComment', 'canChangeStatus'].includes(permission)) {
        return true;
      }
    }

    return this.checkSpacePermission(userId, task.space, permission);
  }

  async checkTeamPermission(userId, teamId, permission) {
    const team = await Team.findById(teamId).select('workspace lead members');
    if (!team) return false;

    if (team.lead?.toString() === userId.toString()) {
      return true;
    }

    const member = team.members.find(m => m.user.toString() === userId.toString());
    if (!member) {
      return this.checkWorkspacePermission(userId, team.workspace, 'canManageMembers');
    }

    const teamPermissions = {
      lead: { canManage: true, canInvite: true, canRemove: true, canEdit: true },
      member: { canManage: false, canInvite: false, canRemove: false, canEdit: false },
      viewer: { canManage: false, canInvite: false, canRemove: false, canEdit: false }
    };

    return teamPermissions[member.role]?.[permission] === true;
  }

  getOwnerPermissions() {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canManageMembers: true,
      canManageSettings: true,
      canCreateSpaces: true,
      canDeleteWorkspace: true,
      canExportData: true,
      canViewAllSpaces: true,
      canCreateTasks: true,
      canEditTasks: true,
      canDeleteTasks: true,
      canComment: true,
      canChangeStatus: true
    };
  }

  getMemberPermissions(member) {
    const basePermissions = {
      canView: true,
      canEdit: false,
      canDelete: false,
      canManageMembers: false,
      canManageSettings: false,
      canCreateSpaces: false,
      canDeleteWorkspace: false,
      canExportData: false,
      canViewAllSpaces: true,
      canCreateTasks: true,
      canEditTasks: true,
      canDeleteTasks: false,
      canComment: true,
      canChangeStatus: true
    };

    const rolePermissions = {
      admin: {
        canEdit: true,
        canManageMembers: true,
        canManageSettings: true,
        canCreateSpaces: true,
        canExportData: true,
        canDeleteTasks: true
      },
      member: {},
      guest: {
        canCreateTasks: false,
        canEditTasks: false,
        canDeleteTasks: false,
        canChangeStatus: false
      }
    };

    return {
      ...basePermissions,
      ...member.permissions,
      ...(rolePermissions[member.role] || {})
    };
  }

  getSpaceMemberPermissions(member) {
    const basePermissions = {
      canView: true,
      canCreateFolders: false,
      canCreateLists: false,
      canCreateTasks: true,
      canEditTasks: true,
      canDeleteTasks: false,
      canManageMembers: false,
      canComment: true,
      canChangeStatus: true
    };

    const rolePermissions = {
      admin: {
        canCreateFolders: true,
        canCreateLists: true,
        canDeleteTasks: true,
        canManageMembers: true
      },
      member: {
        canCreateFolders: true,
        canCreateLists: true
      },
      viewer: {
        canCreateTasks: false,
        canEditTasks: false,
        canComment: false,
        canChangeStatus: false
      }
    };

    return {
      ...basePermissions,
      ...member.permissions,
      ...(rolePermissions[member.role] || {})
    };
  }

  async getUserPermissions(userId, workspaceId) {
    const workspace = await Workspace.findById(workspaceId).select('members owner');
    if (!workspace) return null;

    if (workspace.owner.toString() === userId.toString()) {
      return { role: 'owner', permissions: this.getOwnerPermissions() };
    }

    const member = workspace.members.find(m => m.user.toString() === userId.toString());
    if (!member) return null;

    return { role: member.role, permissions: this.getMemberPermissions(member) };
  }

  async canAccessResource(userId, resourceType, resourceId) {
    switch (resourceType) {
      case 'Workspace':
        return this.checkWorkspacePermission(userId, resourceId, 'canView');
      case 'Space':
        return this.checkSpacePermission(userId, resourceId, 'canView');
      case 'List':
        return this.checkListPermission(userId, resourceId, 'canView');
      case 'Task':
        return this.checkTaskPermission(userId, resourceId, 'canView');
      case 'Team':
        return this.checkTeamPermission(userId, resourceId, 'canView');
      default:
        return false;
    }
  }

  async filterAccessibleResources(userId, resourceType, resources) {
    const accessible = [];
    for (const resource of resources) {
      if (await this.canAccessResource(userId, resourceType, resource._id)) {
        accessible.push(resource);
      }
    }
    return accessible;
  }
}

const permissionService = new PermissionService();
export default permissionService;
