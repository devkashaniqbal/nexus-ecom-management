import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, attendanceAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  TrendingUp,
  Users,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

const Dashboard = () => {
  const { user, isAdmin, isManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      let statsData;

      if (isAdmin) {
        const response = await dashboardAPI.getAdminStats();
        statsData = response.data?.data;
      } else if (isManager) {
        const response = await dashboardAPI.getManagerStats();
        statsData = response.data?.data;
      } else {
        const response = await dashboardAPI.getUserStats();
        statsData = response.data?.data;
      }

      setStats(statsData);

      // Fetch recent attendance for activity
      const activityResponse = await attendanceAPI.getHistory(null, {
        limit: 5,
        skip: 0,
      });
      const activityArray = activityResponse.data?.data?.attendance || activityResponse.data?.data || [];
      setRecentActivity(Array.isArray(activityArray) ? activityArray : []);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
    <div className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div style={{ backgroundColor: `${color}20` }} className="p-3 rounded-lg">
          <Icon size={24} style={{ color }} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user?.firstName || user?.fullName}!
          </h1>
          <p className="text-gray-600 mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 capitalize">Role: {user?.role}</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isAdmin || isManager ? (
            <>
              <StatCard
                icon={Users}
                label="Total Employees"
                value={stats.totalEmployees || 0}
                color="#3B82F6"
              />
              <StatCard
                icon={Clock}
                label="Present Today"
                value={stats.presentToday || 0}
                color="#10B981"
              />
              <StatCard
                icon={FileText}
                label="Pending Timesheets"
                value={stats.pendingTimesheets || 0}
                color="#F59E0B"
              />
              <StatCard
                icon={Calendar}
                label="Pending Leaves"
                value={stats.pendingLeaves || 0}
                color="#EF4444"
              />
            </>
          ) : (
            <>
              <StatCard
                icon={Clock}
                label="Hours This Month"
                value={`${stats.hoursThisMonth || 0}h`}
                color="#3B82F6"
              />
              <StatCard
                icon={CheckCircle}
                label="Tasks Completed"
                value={stats.tasksCompleted || 0}
                color="#10B981"
              />
              <StatCard
                icon={Calendar}
                label="Leave Balance"
                value={`${stats.leaveBalance || 0} days`}
                color="#F59E0B"
              />
              <StatCard
                icon={AlertCircle}
                label="Pending Approvals"
                value={stats.pendingApprovals || 0}
                color="#EF4444"
              />
            </>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/attendance"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-primary-600">
                  Check In/Out
                </p>
                <p className="text-xs text-gray-500">Manage attendance</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
            </div>
          </a>

          <a
            href="/timesheets"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-primary-600">
                  Timesheets
                </p>
                <p className="text-xs text-gray-500">Submit hours</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
            </div>
          </a>

          <a
            href="/leaves"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-primary-600">
                  Request Leave
                </p>
                <p className="text-xs text-gray-500">Apply for time off</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
            </div>
          </a>

          <a
            href="/expenses"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-primary-600">
                  Submit Expense
                </p>
                <p className="text-xs text-gray-500">Report costs</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
            </div>
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Attendance</h2>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Check-in: {new Date(activity.checkInTime).toLocaleTimeString()}
                      {activity.checkOutTime &&
                        ` | Check-out: ${new Date(activity.checkOutTime).toLocaleTimeString()}`}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
