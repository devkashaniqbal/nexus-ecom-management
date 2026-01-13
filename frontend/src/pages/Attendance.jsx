import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  LogIn,
  LogOut,
  Coffee,
  Clock,
  AlertCircle,
  CheckCircle,
  Search,
} from 'lucide-react';

const Attendance = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [onBreak, setOnBreak] = useState(false);
  const [searchDate, setSearchDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const todayResponse = await attendanceAPI.getToday();
      const todayData = todayResponse.data?.data?.attendance || null;
      setToday(todayData);

      // Sync break state with attendance status
      if (todayData) {
        setOnBreak(todayData.status === 'break' || todayData.status === 'short_leave');
      }

      const historyResponse = await attendanceAPI.getHistory(null, {
        limit: 20,
        skip: 0,
      });

      // Handle both array and object responses
      const historyData = historyResponse.data?.data?.attendance || historyResponse.data?.data || [];
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      setError('Failed to load attendance data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      await attendanceAPI.checkIn({
        latitude: 0,
        longitude: 0,
      });

      setSuccess('Checked in successfully');
      await fetchAttendanceData();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to check in'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      await attendanceAPI.checkOut({
        latitude: 0,
        longitude: 0,
      });

      setSuccess('Checked out successfully');
      await fetchAttendanceData();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to check out'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartBreak = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      await attendanceAPI.startBreak({
        type: 'break',
        reason: 'Regular break'
      });

      setSuccess('Break started successfully');
      setOnBreak(true);
      await fetchAttendanceData();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to start break'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndBreak = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      await attendanceAPI.endBreak();

      setSuccess('Break ended');
      setOnBreak(false);
      await fetchAttendanceData();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to end break'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const filteredHistory = history.filter((record) => {
    if (filterStatus === 'all') return true;
    return record.status === filterStatus;
  });

  const StatusBadge = ({ status }) => {
    const styles = {
      working: 'bg-blue-100 text-blue-800',
      break: 'bg-yellow-100 text-yellow-800',
      short_leave: 'bg-orange-100 text-orange-800',
      checked_out: 'bg-green-100 text-green-800',
      offline: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      working: 'Working',
      break: 'On Break',
      short_leave: 'Short Leave',
      checked_out: 'Checked Out',
      offline: 'Offline',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.offline}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
        <p className="text-gray-600 mt-1">Track your check-in, check-out, and breaks</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Today's Status Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Status</h2>

        {today ? (
          <div className="space-y-4">
            {/* Time Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Check-in Time</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {today.checkIn?.time
                    ? new Date(today.checkIn.time).toLocaleTimeString()
                    : 'Not checked in'}
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Check-out Time</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {today.checkOut?.time
                    ? new Date(today.checkOut.time).toLocaleTimeString()
                    : 'Not checked out'}
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {today.totalWorkHours ? `${today.totalWorkHours.toFixed(1)}h` : '0h'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {!today.checkIn?.time && (
                <button
                  onClick={handleCheckIn}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <LogIn size={18} />
                  Check In
                </button>
              )}

              {today.checkIn?.time && !today.checkOut?.time && (
                <>
                  {onBreak ? (
                    <button
                      onClick={handleEndBreak}
                      disabled={submitting}
                      className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                    >
                      <Coffee size={18} />
                      End Break
                    </button>
                  ) : (
                    <button
                      onClick={handleStartBreak}
                      disabled={submitting}
                      className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                    >
                      <Coffee size={18} />
                      Start Break
                    </button>
                  )}

                  <button
                    onClick={handleCheckOut}
                    disabled={submitting || onBreak}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <LogOut size={18} />
                    Check Out
                  </button>
                </>
              )}
            </div>

            {/* Break Information */}
            {today.breaks && today.breaks.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-2">Breaks Taken</p>
                <div className="space-y-1">
                  {today.breaks.map((breakItem, idx) => (
                    <p key={idx} className="text-sm text-gray-600">
                      {new Date(breakItem.startTime).toLocaleTimeString()} -{' '}
                      {breakItem.endTime
                        ? new Date(breakItem.endTime).toLocaleTimeString()
                        : 'Ongoing'}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No attendance record for today yet</p>
            <button
              onClick={handleCheckIn}
              disabled={submitting}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 mx-auto"
            >
              <LogIn size={18} />
              {submitting ? 'Checking in...' : 'Check In'}
            </button>
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance History</h2>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="all">All</option>
              <option value="working">Working</option>
              <option value="break">On Break</option>
              <option value="short_leave">Short Leave</option>
              <option value="checked_out">Checked Out</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>

        {/* History Table */}
        {filteredHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Check-in</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Check-out</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((record) => (
                  <tr key={record._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {record.checkIn?.time
                        ? new Date(record.checkIn.time).toLocaleTimeString()
                        : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {record.checkOut?.time
                        ? new Date(record.checkOut.time).toLocaleTimeString()
                        : '-'}
                    </td>
                    <td className="py-3 px-4">{record.totalWorkHours ? record.totalWorkHours.toFixed(1) : '0'}h</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={record.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No attendance records found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
