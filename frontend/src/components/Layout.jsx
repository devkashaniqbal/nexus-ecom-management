import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import NotificationDropdown from './NotificationDropdown';
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
  LogOut,
  Menu,
  X,
  User,
  Brain,
  Briefcase,
  CheckSquare,
  UsersRound,
  MessageSquare,
  ChevronDown,
  Search,
} from 'lucide-react';

const Layout = () => {
  const { user, logout, isAdmin, isManager } = useAuth();
  const { workspaces, currentWorkspace, switchWorkspace } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager', 'employee'] },
    { path: '/workspaces', icon: Briefcase, label: 'Workspaces', roles: ['admin', 'manager', 'employee'] },
    { path: '/tasks', icon: CheckSquare, label: 'My Tasks', roles: ['admin', 'manager', 'employee'] },
    { path: '/teams', icon: UsersRound, label: 'Teams', roles: ['admin', 'manager', 'employee'] },
    { path: '/messages', icon: MessageSquare, label: 'Messages', roles: ['admin', 'manager', 'employee'] },
    { path: '/notifications', icon: Bell, label: 'Notifications', roles: ['admin', 'manager', 'employee'] },
    { path: '/attendance', icon: Clock, label: 'Attendance', roles: ['admin', 'manager', 'employee'] },
    { path: '/projects', icon: FolderKanban, label: 'Projects', roles: ['admin', 'manager', 'employee'] },
    { path: '/timesheets', icon: FileText, label: 'Timesheets', roles: ['admin', 'manager', 'employee'] },
    { path: '/assets', icon: Package, label: 'Assets', roles: ['admin', 'manager', 'employee'] },
    { path: '/expenses', icon: DollarSign, label: 'Expenses', roles: ['admin', 'manager', 'employee'] },
    { path: '/leaves', icon: Calendar, label: 'Leaves', roles: ['admin', 'manager', 'employee'] },
    { path: '/announcements', icon: Bell, label: 'Announcements', roles: ['admin', 'manager', 'employee'] },
    { path: '/ai-agent', icon: Brain, label: 'AI Agent', roles: ['admin', 'manager', 'employee'] },
    { path: '/users', icon: Users, label: 'Users', roles: ['admin', 'manager'] },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user?.role)
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-primary-600">Nexus Ecom</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <Link
            to="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 mb-2"
          >
            <User size={20} />
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.fullName || `${user?.firstName} ${user?.lastName}`}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.role}</p>
              </div>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {/* Workspace Switcher */}
            {workspaces.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg"
                >
                  {currentWorkspace && (
                    <>
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: currentWorkspace.color || '#7C3AED' }}
                      >
                        {currentWorkspace.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{currentWorkspace.name}</span>
                    </>
                  )}
                  <ChevronDown size={16} className="text-gray-500" />
                </button>

                {workspaceDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-500 px-2 py-1">Workspaces</p>
                      {workspaces.map((workspace) => (
                        <button
                          key={workspace._id}
                          onClick={() => {
                            switchWorkspace(workspace);
                            setWorkspaceDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 ${
                            currentWorkspace?._id === workspace._id ? 'bg-purple-50' : ''
                          }`}
                        >
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: workspace.color || '#7C3AED' }}
                          >
                            {workspace.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-900">{workspace.name}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-200 p-2">
                      <button
                        onClick={() => {
                          navigate('/workspaces');
                          setWorkspaceDropdownOpen(false);
                        }}
                        className="w-full text-left px-2 py-2 text-sm text-purple-600 hover:bg-gray-100 rounded"
                      >
                        Manage workspaces
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks, projects..."
                className="pl-10 pr-4 py-2 w-64 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationDropdown />
            <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium">
                {user?.firstName?.charAt(0)}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
