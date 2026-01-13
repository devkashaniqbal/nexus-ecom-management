import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
} from 'lucide-react';

const Layout = () => {
  const { user, logout, isAdmin, isManager } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager', 'employee'] },
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

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
