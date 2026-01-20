import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { salaryAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Wallet,
  Calculator,
  Clock,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Users,
  TrendingDown,
  TrendingUp,
  Eye,
  X,
  Settings,
  Play,
  Check,
  CreditCard,
  FileText,
  Calendar,
} from 'lucide-react';

const Salaries = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    officeStartTime: '10:00',
    officeEndTime: '18:00',
    workingHoursPerDay: 8,
    workingDaysPerMonth: 22,
    lateGracePeriodMinutes: 15,
    overtimeRateMultiplier: 1.5,
    currency: 'PKR'
  });

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [recordsRes, statsRes, settingsRes] = await Promise.all([
        salaryAPI.getAll({ month: selectedMonth, year: selectedYear }),
        salaryAPI.getStats({ month: selectedMonth, year: selectedYear }),
        salaryAPI.getSettings()
      ]);

      setRecords(recordsRes.data?.data?.records || []);
      setStats(statsRes.data?.data?.stats || null);
      const fetchedSettings = settingsRes.data?.data?.settings || {};
      setSettings(fetchedSettings);
      setSettingsForm({
        officeStartTime: fetchedSettings.officeStartTime || '10:00',
        officeEndTime: fetchedSettings.officeEndTime || '18:00',
        workingHoursPerDay: fetchedSettings.workingHoursPerDay || 8,
        workingDaysPerMonth: fetchedSettings.workingDaysPerMonth || 22,
        lateGracePeriodMinutes: fetchedSettings.lateGracePeriodMinutes || 15,
        overtimeRateMultiplier: fetchedSettings.overtimeRateMultiplier || 1.5,
        currency: fetchedSettings.currency || 'PKR'
      });
    } catch (err) {
      setError('Failed to load salary data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAll = async () => {
    try {
      setGenerating(true);
      setError('');
      setSuccess('');

      await salaryAPI.generateAll({ month: selectedMonth, year: selectedYear });
      setSuccess('Salary records generated successfully');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate salary records');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (recordId) => {
    try {
      setError('');
      await salaryAPI.approve(recordId);
      setSuccess('Salary approved successfully');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve salary');
    }
  };

  const handleMarkPaid = async (recordId) => {
    try {
      setError('');
      await salaryAPI.markPaid(recordId, { paymentMethod: 'bank_transfer' });
      setSuccess('Salary marked as paid');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark salary as paid');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setError('');
      await salaryAPI.updateSettings(settingsForm);
      setSuccess('Settings saved successfully');
      setShowSettingsModal(false);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Salary Management</h1>
          <p className="text-gray-600 mt-1">Manage employee salaries and payroll</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Settings size={18} />
                Settings
              </button>
              <button
                onClick={handleGenerateAll}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <Calculator size={18} />
                {generating ? 'Generating...' : 'Generate Salaries'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Period Selection */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Office Time: <span className="font-medium">{settings?.officeStartTime || '10:00'}</span> -
            <span className="font-medium">{settings?.officeEndTime || '18:00'}</span> |
            Grace Period: <span className="font-medium">{settings?.lateGracePeriodMinutes || 15} mins</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalRecords}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Payroll</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalNetSalary)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Deductions</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalDeductions)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Late Minutes</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalLateMinutes} mins</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Summary */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Status Summary</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
              <span className="text-sm text-gray-600">Draft: {stats.byStatus?.draft || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
              <span className="text-sm text-gray-600">Pending: {stats.byStatus?.pending || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
              <span className="text-sm text-gray-600">Approved: {stats.byStatus?.approved || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-400 rounded-full"></span>
              <span className="text-sm text-gray-600">Paid: {stats.byStatus?.paid || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Salary Records Table */}
      {records.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Employee</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Base Salary</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Days</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Late</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Deductions</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Net Salary</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {record.user?.firstName} {record.user?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{record.user?.department}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{formatCurrency(record.baseSalary)}</td>
                    <td className="py-3 px-4">
                      <span className="text-green-600">{record.presentDays}</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-gray-600">{record.workingDays}</span>
                    </td>
                    <td className="py-3 px-4">
                      {record.lateDays > 0 ? (
                        <span className="text-red-600">{record.lateDays} days ({record.totalLateMinutes} mins)</span>
                      ) : (
                        <span className="text-green-600">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-red-600">
                      -{formatCurrency(record.lateDeduction + record.absentDeduction)}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">{formatCurrency(record.netSalary)}</td>
                    <td className="py-3 px-4">{getStatusBadge(record.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowDetailModal(true);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {isAdmin && record.status === 'draft' && (
                          <button
                            onClick={() => handleApprove(record._id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Approve"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        {isAdmin && record.status === 'approved' && (
                          <button
                            onClick={() => handleMarkPaid(record._id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Mark as Paid"
                          >
                            <CreditCard size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No salary records for this period</p>
          {isAdmin && (
            <button
              onClick={handleGenerateAll}
              disabled={generating}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Generate Salaries for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </button>
          )}
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Salary Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-600 hover:text-gray-900">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Office Start Time</label>
                  <input
                    type="time"
                    value={settingsForm.officeStartTime}
                    onChange={(e) => setSettingsForm({ ...settingsForm, officeStartTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Office End Time</label>
                  <input
                    type="time"
                    value={settingsForm.officeEndTime}
                    onChange={(e) => setSettingsForm({ ...settingsForm, officeEndTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours/Day</label>
                  <input
                    type="number"
                    value={settingsForm.workingHoursPerDay}
                    onChange={(e) => setSettingsForm({ ...settingsForm, workingHoursPerDay: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Working Days/Month</label>
                  <input
                    type="number"
                    value={settingsForm.workingDaysPerMonth}
                    onChange={(e) => setSettingsForm({ ...settingsForm, workingDaysPerMonth: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Late Grace Period (mins)</label>
                  <input
                    type="number"
                    value={settingsForm.lateGracePeriodMinutes}
                    onChange={(e) => setSettingsForm({ ...settingsForm, lateGracePeriodMinutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Rate Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settingsForm.overtimeRateMultiplier}
                    onChange={(e) => setSettingsForm({ ...settingsForm, overtimeRateMultiplier: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Salary Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-600 hover:text-gray-900">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Employee Info */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-bold">
                    {selectedRecord.user?.firstName?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedRecord.user?.firstName} {selectedRecord.user?.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedRecord.user?.department} | {selectedRecord.user?.designation}
                  </p>
                </div>
                <div className="ml-auto">
                  {getStatusBadge(selectedRecord.status)}
                </div>
              </div>

              {/* Salary Breakdown */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Salary Breakdown</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Salary</span>
                    <span className="font-medium">{formatCurrency(selectedRecord.baseSalary)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Late Deduction ({selectedRecord.totalLateMinutes} mins)</span>
                    <span>-{formatCurrency(selectedRecord.lateDeduction)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Absent Deduction ({selectedRecord.absentDays} days)</span>
                    <span>-{formatCurrency(selectedRecord.absentDeduction)}</span>
                  </div>
                  {selectedRecord.overtimeAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Overtime ({selectedRecord.overtimeHours} hrs)</span>
                      <span>+{formatCurrency(selectedRecord.overtimeAmount)}</span>
                    </div>
                  )}
                  {selectedRecord.bonus > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Bonus</span>
                      <span>+{formatCurrency(selectedRecord.bonus)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-lg">
                    <span>Net Salary</span>
                    <span className="text-primary-600">{formatCurrency(selectedRecord.netSalary)}</span>
                  </div>
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Attendance Summary</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{selectedRecord.presentDays}</p>
                    <p className="text-xs text-gray-600">Present</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{selectedRecord.absentDays}</p>
                    <p className="text-xs text-gray-600">Absent</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{selectedRecord.lateDays}</p>
                    <p className="text-xs text-gray-600">Late Days</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedRecord.workingDays}</p>
                    <p className="text-xs text-gray-600">Working Days</p>
                  </div>
                </div>
              </div>

              {/* Rate Info */}
              {selectedRecord.breakdown && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Rate Information</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Per Day: {formatCurrency(selectedRecord.breakdown.perDaySalary)}</p>
                    <p>Per Hour: {formatCurrency(selectedRecord.breakdown.perHourSalary)}</p>
                    <p>Per Minute: {formatCurrency(Math.round(selectedRecord.breakdown.perMinuteSalary * 100) / 100)}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Salaries;
