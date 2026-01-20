import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updatePassword: (data) => api.put('/auth/update-password', data),
};

export const attendanceAPI = {
  checkIn: (data) => api.post('/attendance/check-in', data),
  checkOut: (data) => api.post('/attendance/check-out', data),
  startBreak: (data) => api.post('/attendance/break/start', data),
  endBreak: () => api.post('/attendance/break/end'),
  getToday: () => api.get('/attendance/today'),
  getHistory: (userId, params) => api.get(`/attendance/history/${userId || ''}`, { params }),
  getSummary: (userId, params) => api.get(`/attendance/summary/${userId || ''}`, { params }),
  getAllToday: () => api.get('/attendance/all/today'),
};

export const screenshotAPI = {
  upload: (data) => api.post('/screenshots/upload', data),
  checkStatus: () => api.get('/screenshots/status'),
  getMy: (params) => api.get('/screenshots/my', { params }),
  getUser: (userId, params) => api.get(`/screenshots/user/${userId}`, { params }),
  getUrl: (screenshotId) => api.get(`/screenshots/${screenshotId}/url`),
};

export const projectAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  assignTeam: (id, data) => api.post(`/projects/${id}/assign-team`, data),
  removeTeamMember: (id, memberId) => api.delete(`/projects/${id}/team/${memberId}`),
  getMyProjects: () => api.get('/projects/user/assigned'),
};

export const timesheetAPI = {
  getAll: (params) => api.get('/timesheets', { params }),
  getMy: (params) => api.get('/timesheets/my-timesheets', { params }),
  getOne: (id) => api.get(`/timesheets/${id}`),
  create: (data) => api.post('/timesheets', data),
  update: (id, data) => api.put(`/timesheets/${id}`, data),
  delete: (id) => api.delete(`/timesheets/${id}`),
  submit: (id) => api.post(`/timesheets/${id}/submit`),
  approve: (id, data) => api.post(`/timesheets/${id}/approve`, data),
  reject: (id, data) => api.post(`/timesheets/${id}/reject`, data),
};

export const assetAPI = {
  getAll: (params) => api.get('/assets', { params }),
  getMy: () => api.get('/assets/my-assets'),
  getOne: (id) => api.get(`/assets/${id}`),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  delete: (id) => api.delete(`/assets/${id}`),
  assign: (id, data) => api.post(`/assets/${id}/assign`, data),
  unassign: (id) => api.post(`/assets/${id}/unassign`),
  getHistory: (id) => api.get(`/assets/${id}/history`),
  updateStatus: (id, data) => api.post(`/assets/${id}/status`, data),
};

export const expenseAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  getMy: (params) => api.get('/expenses/my-expenses', { params }),
  getOne: (id) => api.get(`/expenses/${id}`),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  approve: (id, data) => api.post(`/expenses/${id}/approve`, data),
  reject: (id, data) => api.post(`/expenses/${id}/reject`, data),
};

export const leaveAPI = {
  getAll: (params) => api.get('/leaves', { params }),
  getMy: (params) => api.get('/leaves/my-leaves', { params }),
  getOne: (id) => api.get(`/leaves/${id}`),
  create: (data) => api.post('/leaves', data),
  update: (id, data) => api.put(`/leaves/${id}`, data),
  delete: (id) => api.delete(`/leaves/${id}`),
  approve: (id, data) => api.post(`/leaves/${id}/approve`, data),
  reject: (id, data) => api.post(`/leaves/${id}/reject`, data),
  cancel: (id) => api.post(`/leaves/${id}/cancel`),
};

export const announcementAPI = {
  getAll: (params) => api.get('/announcements', { params }),
  getAllAdmin: (params) => api.get('/announcements/admin/all', { params }),
  getOne: (id) => api.get(`/announcements/${id}`),
  create: (data) => api.post('/announcements', data),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
  markRead: (id) => api.post(`/announcements/${id}/mark-read`),
  markUnread: (id) => api.post(`/announcements/${id}/mark-unread`),
  getUnreadCount: () => api.get('/announcements/unread/count'),
};

export const dashboardAPI = {
  getUserStats: () => api.get('/dashboard/user/stats'),
  getManagerStats: () => api.get('/dashboard/manager/stats'),
  getAdminStats: () => api.get('/dashboard/admin/stats'),
  getTimesheetAnalytics: (params) => api.get('/dashboard/analytics/timesheets', { params }),
  getExpenseAnalytics: (params) => api.get('/dashboard/analytics/expenses', { params }),
  getLeaveAnalytics: (params) => api.get('/dashboard/analytics/leaves', { params }),
};

export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getAvailableRoutes: () => api.get('/users/route-permissions/available'),
  updatePermissions: (id, allowedRoutes) => api.put(`/users/${id}/permissions`, { allowedRoutes }),
};

export const salaryAPI = {
  getAll: (params) => api.get('/salaries', { params }),
  getOne: (id) => api.get(`/salaries/${id}`),
  calculate: (userId, data) => api.post(`/salaries/calculate/${userId}`, data),
  generateAll: (data) => api.post('/salaries/generate-all', data),
  update: (id, data) => api.put(`/salaries/${id}`, data),
  approve: (id) => api.post(`/salaries/${id}/approve`),
  markPaid: (id, data) => api.post(`/salaries/${id}/pay`, data),
  getStats: (params) => api.get('/salaries/stats/summary', { params }),
  getSettings: () => api.get('/salaries/settings'),
  updateSettings: (data) => api.put('/salaries/settings', data),
};

export const aiAgentAPI = {
  chat: (data) => api.post('/ai-agent/chat', data),
  getChatHistory: (sessionId) => api.get(`/ai-agent/chat/sessions/${sessionId}`),
  getAllSessions: (params) => api.get('/ai-agent/chat/sessions', { params }),
  deleteSession: (sessionId) => api.delete(`/ai-agent/chat/sessions/${sessionId}`),
  exportChatHistory: (sessionId) => api.get(`/ai-agent/chat/sessions/${sessionId}/export`),
  addKnowledge: (data) => api.post('/ai-agent/knowledge', data),
  bulkImportKnowledge: (data) => api.post('/ai-agent/knowledge/bulk-import', data),
  getKnowledge: (params) => api.get('/ai-agent/knowledge', { params }),
  updateKnowledge: (id, data) => api.patch(`/ai-agent/knowledge/${id}`, data),
  deleteKnowledge: (id) => api.delete(`/ai-agent/knowledge/${id}`),
  getAnalytics: (params) => api.get('/ai-agent/analytics', { params }),
};

// Workspace API
export const workspaceAPI = {
  getAll: () => api.get('/workspaces'),
  get: (id) => api.get(`/workspaces/${id}`),
  getById: (id) => api.get(`/workspaces/${id}`),
  create: (data) => api.post('/workspaces', data),
  update: (id, data) => api.put(`/workspaces/${id}`, data),
  delete: (id) => api.delete(`/workspaces/${id}`),
  inviteMember: (id, data) => api.post(`/workspaces/${id}/invite`, data),
  removeMember: (id, userId) => api.delete(`/workspaces/${id}/members/${userId}`),
  updateMemberRole: (id, userId, role) => api.put(`/workspaces/${id}/members/${userId}/role`, { role }),
  createInviteLink: (id, data) => api.post(`/workspaces/${id}/invite-link`, data),
  joinByLink: (code) => api.post(`/workspaces/join/${code}`),
  getActivity: (id, params) => api.get(`/workspaces/${id}/activity`, { params })
};

// Space API
export const spaceAPI = {
  getAll: (workspaceId) => api.get(`/workspaces/${workspaceId}/spaces`),
  get: (workspaceId, spaceId) => api.get(`/workspaces/${workspaceId}/spaces/${spaceId}`),
  getById: (workspaceId, spaceId) => api.get(`/workspaces/${workspaceId}/spaces/${spaceId}`),
  create: (workspaceId, data) => api.post(`/workspaces/${workspaceId}/spaces`, data),
  update: (workspaceId, spaceId, data) => api.put(`/workspaces/${workspaceId}/spaces/${spaceId}`, data),
  delete: (workspaceId, spaceId) => api.delete(`/workspaces/${workspaceId}/spaces/${spaceId}`),
  addMember: (workspaceId, spaceId, data) => api.post(`/workspaces/${workspaceId}/spaces/${spaceId}/members`, data),
  removeMember: (workspaceId, spaceId, userId) => api.delete(`/workspaces/${workspaceId}/spaces/${spaceId}/members/${userId}`),
  archive: (workspaceId, spaceId) => api.post(`/workspaces/${workspaceId}/spaces/${spaceId}/archive`),
  restore: (workspaceId, spaceId) => api.post(`/workspaces/${workspaceId}/spaces/${spaceId}/restore`)
};

// Folder API
export const folderAPI = {
  getAll: (workspaceId, spaceId) => api.get(`/workspaces/${workspaceId}/spaces/${spaceId}/folders`),
  get: (workspaceId, spaceId, folderId) => api.get(`/workspaces/${workspaceId}/spaces/${spaceId}/folders/${folderId}`),
  create: (workspaceId, spaceId, data) => api.post(`/workspaces/${workspaceId}/spaces/${spaceId}/folders`, data),
  update: (workspaceId, spaceId, folderId, data) => api.put(`/workspaces/${workspaceId}/spaces/${spaceId}/folders/${folderId}`, data),
  delete: (workspaceId, spaceId, folderId, moveListsTo) => api.delete(`/workspaces/${workspaceId}/spaces/${spaceId}/folders/${folderId}`, { data: { moveListsTo } }),
  archive: (workspaceId, spaceId, folderId) => api.post(`/workspaces/${workspaceId}/spaces/${spaceId}/folders/${folderId}/archive`),
  restore: (workspaceId, spaceId, folderId) => api.post(`/workspaces/${workspaceId}/spaces/${spaceId}/folders/${folderId}/restore`)
};

// List API
export const listAPI = {
  getAll: (workspaceId, spaceId, folderId) => {
    const params = folderId ? { folderId } : {};
    return api.get(`/workspaces/${workspaceId}/spaces/${spaceId}/lists`, { params });
  },
  get: (workspaceId, spaceId, listId) => api.get(`/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}`),
  create: (workspaceId, spaceId, data) => api.post(`/workspaces/${workspaceId}/spaces/${spaceId}/lists`, data),
  update: (workspaceId, spaceId, listId, data) => api.put(`/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}`, data),
  delete: (workspaceId, spaceId, listId) => api.delete(`/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}`),
  move: (workspaceId, spaceId, listId, data) => api.put(`/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/move`, data),
  addStatus: (workspaceId, spaceId, listId, data) => api.post(`/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/statuses`, data),
  updateStatus: (workspaceId, spaceId, listId, statusId, data) => api.put(`/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/statuses/${statusId}`, data),
  deleteStatus: (workspaceId, spaceId, listId, statusId, moveTasksTo) => api.delete(`/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/statuses/${statusId}`, { data: { moveTasksTo } }),
  addCustomField: (workspaceId, spaceId, listId, data) => api.post(`/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/custom-fields`, data)
};

// Task API
export const taskAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getMyTasks: (params) => api.get('/tasks/my-tasks', { params }),
  getByList: (workspaceId, spaceId, listId, params) => api.get(`/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks`, { params }),
  get: (id) => api.get(`/tasks/${id}`),
  create: (workspaceId, spaceId, listId, data) => api.post(`/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/tasks`, data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  reorder: (listId, data) => api.put(`/tasks/list/${listId}/reorder`, data),
  addAssignee: (id, userId) => api.post(`/tasks/${id}/assignees`, { userId }),
  removeAssignee: (id, userId) => api.delete(`/tasks/${id}/assignees/${userId}`),
  addComment: (id, data) => api.post(`/tasks/${id}/comments`, data),
  getComments: (id, params) => api.get(`/tasks/${id}/comments`, { params }),
  addChecklist: (id, data) => api.post(`/tasks/${id}/checklists`, data),
  updateChecklistItem: (id, checklistId, itemId, data) => api.put(`/tasks/${id}/checklists/${checklistId}/items/${itemId}`, data),
  addAttachment: (id, data) => api.post(`/tasks/${id}/attachments`, data),
  startTimeTracking: (id) => api.post(`/tasks/${id}/time-tracking/start`),
  stopTimeTracking: (id, data) => api.post(`/tasks/${id}/time-tracking/stop`, data),
  addDependency: (id, data) => api.post(`/tasks/${id}/dependencies`, data),
  move: (id, data) => api.put(`/tasks/${id}/move`, data),
  watch: (id) => api.post(`/tasks/${id}/watch`),
  unwatch: (id) => api.delete(`/tasks/${id}/watch`)
};

// Team API
export const teamAPI = {
  getAll: (workspaceId) => api.get(`/teams/workspace/${workspaceId}`),
  getMyTeams: () => api.get('/teams/my-teams'),
  get: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`),
  addMember: (id, data) => api.post(`/teams/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/teams/${id}/members/${userId}`),
  updateMemberRole: (id, userId, role) => api.put(`/teams/${id}/members/${userId}/role`, { role }),
  linkSpace: (id, spaceId) => api.post(`/teams/${id}/link-space`, { spaceId })
};

// Channel API
export const channelAPI = {
  getAll: (params) => api.get('/channels', { params }),
  get: (id) => api.get(`/channels/${id}`),
  create: (data) => api.post('/channels', data),
  update: (id, data) => api.put(`/channels/${id}`, data),
  delete: (id) => api.delete(`/channels/${id}`),
  join: (id) => api.post(`/channels/${id}/join`),
  leave: (id) => api.post(`/channels/${id}/leave`),
  addMember: (id, userId) => api.post(`/channels/${id}/members`, { userId }),
  getOrCreateDirect: (data) => api.post('/channels/direct', data),
  markAsRead: (id) => api.post(`/channels/${id}/mark-read`),
  sendMessage: (id, data) => api.post(`/channels/${id}/messages`, data),
  getMessages: (id, params) => api.get(`/channels/${id}/messages`, { params }),
  editMessage: (id, messageId, data) => api.put(`/channels/${id}/messages/${messageId}`, data),
  deleteMessage: (id, messageId) => api.delete(`/channels/${id}/messages/${messageId}`),
  addReaction: (id, messageId, emoji) => api.post(`/channels/${id}/messages/${messageId}/reactions`, { emoji }),
  removeReaction: (id, messageId, emoji) => api.delete(`/channels/${id}/messages/${messageId}/reactions`, { data: { emoji } })
};

// Notification API
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: (data) => api.post('/notifications/mark-all-read', data),
  delete: (id) => api.delete(`/notifications/${id}`),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data) => api.put('/notifications/preferences', data)
};

// Role API
export const roleAPI = {
  changeRole: (userId, data) => api.put(`/roles/users/${userId}/role`, data),
  changeManager: (userId, data) => api.put(`/roles/users/${userId}/manager`, data),
  changeDepartment: (userId, data) => api.put(`/roles/users/${userId}/department`, data),
  changeDesignation: (userId, data) => api.put(`/roles/users/${userId}/designation`, data),
  promoteUser: (userId, data) => api.post(`/roles/users/${userId}/promote`, data),
  getUserHistory: (userId, params) => api.get(`/roles/users/${userId}/history`, { params }),
  getMyHistory: () => api.get('/roles/my-history'),
  getPendingHandovers: () => api.get('/roles/handovers/pending'),
  completeHandover: (roleHistoryId, data) => api.post(`/roles/handovers/${roleHistoryId}/complete`, data),
  updateHandoverTask: (roleHistoryId, taskIndex, data) => api.put(`/roles/handovers/${roleHistoryId}/tasks/${taskIndex}`, data),
  getAllChanges: (params) => api.get('/roles/changes', { params })
};

export default api;
