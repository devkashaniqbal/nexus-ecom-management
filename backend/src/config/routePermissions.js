export const AVAILABLE_ROUTES = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', defaultEnabled: true },
  { key: 'workspaces', label: 'Workspaces', path: '/workspaces', defaultEnabled: true },
  { key: 'tasks', label: 'My Tasks', path: '/tasks', defaultEnabled: true },
  { key: 'teams', label: 'Teams', path: '/teams', defaultEnabled: true },
  { key: 'messages', label: 'Messages', path: '/messages', defaultEnabled: true },
  { key: 'notifications', label: 'Notifications', path: '/notifications', defaultEnabled: true },
  { key: 'attendance', label: 'Attendance', path: '/attendance', defaultEnabled: true },
  { key: 'projects', label: 'Projects', path: '/projects', defaultEnabled: true },
  { key: 'timesheets', label: 'Timesheets', path: '/timesheets', defaultEnabled: true },
  { key: 'assets', label: 'Assets', path: '/assets', defaultEnabled: false },
  { key: 'expenses', label: 'Expenses', path: '/expenses', defaultEnabled: false },
  { key: 'leaves', label: 'Leaves', path: '/leaves', defaultEnabled: true },
  { key: 'announcements', label: 'Announcements', path: '/announcements', defaultEnabled: true },
  { key: 'ai-agent', label: 'AI Agent', path: '/ai-agent', defaultEnabled: false },
  { key: 'users', label: 'Users', path: '/users', adminOnly: true, defaultEnabled: true },
];

export const getDefaultRoutes = (role) => {
  if (role === 'admin') {
    return AVAILABLE_ROUTES.map(r => r.key);
  }
  return AVAILABLE_ROUTES
    .filter(r => r.defaultEnabled && !r.adminOnly)
    .map(r => r.key);
};

export default AVAILABLE_ROUTES;
