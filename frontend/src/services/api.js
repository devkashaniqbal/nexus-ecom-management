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

export default api;
