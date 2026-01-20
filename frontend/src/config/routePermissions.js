import {
  LayoutDashboard,
  Clock,
  FolderKanban,
  FileText,
  Package,
  DollarSign,
  Calendar,
  Bell,
  Users,
  Brain,
  Briefcase,
  CheckSquare,
  UsersRound,
  MessageSquare,
  Wallet,
} from 'lucide-react';

export const AVAILABLE_ROUTES = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, defaultEnabled: true },
  { key: 'workspaces', label: 'Workspaces', path: '/workspaces', icon: Briefcase, defaultEnabled: true },
  { key: 'tasks', label: 'My Tasks', path: '/tasks', icon: CheckSquare, defaultEnabled: true },
  { key: 'teams', label: 'Teams', path: '/teams', icon: UsersRound, defaultEnabled: true },
  { key: 'messages', label: 'Messages', path: '/messages', icon: MessageSquare, defaultEnabled: true },
  { key: 'notifications', label: 'Notifications', path: '/notifications', icon: Bell, defaultEnabled: true },
  { key: 'attendance', label: 'Attendance', path: '/attendance', icon: Clock, defaultEnabled: true },
  { key: 'projects', label: 'Projects', path: '/projects', icon: FolderKanban, defaultEnabled: true },
  { key: 'timesheets', label: 'Timesheets', path: '/timesheets', icon: FileText, defaultEnabled: true },
  { key: 'assets', label: 'Assets', path: '/assets', icon: Package, defaultEnabled: false },
  { key: 'expenses', label: 'Expenses', path: '/expenses', icon: DollarSign, defaultEnabled: false },
  { key: 'leaves', label: 'Leaves', path: '/leaves', icon: Calendar, defaultEnabled: true },
  { key: 'announcements', label: 'Announcements', path: '/announcements', icon: Bell, defaultEnabled: true },
  { key: 'ai-agent', label: 'AI Agent', path: '/ai-agent', icon: Brain, defaultEnabled: false },
  { key: 'users', label: 'Users', path: '/users', icon: Users, adminOnly: true, defaultEnabled: true },
  { key: 'salaries', label: 'Salaries', path: '/salaries', icon: Wallet, adminOnly: true, defaultEnabled: true },
];

export const getDefaultRoutes = (role) => {
  if (role === 'admin') {
    return AVAILABLE_ROUTES.map(r => r.key);
  }
  return AVAILABLE_ROUTES
    .filter(r => r.defaultEnabled && !r.adminOnly)
    .map(r => r.key);
};

export const getRouteByKey = (key) => {
  return AVAILABLE_ROUTES.find(r => r.key === key);
};

export const getRouteByPath = (path) => {
  return AVAILABLE_ROUTES.find(r => r.path === path);
};

export default AVAILABLE_ROUTES;
