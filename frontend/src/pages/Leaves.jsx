import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { leaveAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  Search,
  X,
} from 'lucide-react';

const Leaves = () => {
  const { user, isManager, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    attachments: '',
  });

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await leaveAPI.getMy({
        limit: 50,
        skip: 0,
      });
      const dataArray = response.data?.data?.leaves || response.data?.data || [];
      setLeaves(Array.isArray(dataArray) ? dataArray : []);
    } catch (err) {
      setError('Failed to load leaves');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (leave = null) => {
    if (leave) {
      setEditingId(leave._id);
      setFormData({
        leaveType: leave.leaveType,
        startDate: leave.startDate?.split('T')[0] || '',
        endDate: leave.endDate?.split('T')[0] || '',
        reason: leave.reason,
        attachments: leave.attachments?.join(', ') || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        leaveType: 'annual',
        startDate: '',
        endDate: '',
        reason: '',
        attachments: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setSuccess('');

      const submitData = {
        ...formData,
        attachments: formData.attachments
          .split(',')
          .map((a) => a.trim())
          .filter((a) => a),
      };

      if (editingId) {
        await leaveAPI.update(editingId, submitData);
        setSuccess('Leave updated successfully');
      } else {
        await leaveAPI.create(submitData);
        setSuccess('Leave application submitted successfully');
      }

      handleCloseModal();
      await fetchLeaves();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to save leave'
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this leave request?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await leaveAPI.delete(id);
      setSuccess('Leave deleted successfully');
      await fetchLeaves();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to delete leave'
      );
    }
  };

  const handleApprove = async (id) => {
    try {
      setError('');
      setSuccess('');
      await leaveAPI.approve(id, { notes: '' });
      setSuccess('Leave approved successfully');
      await fetchLeaves();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to approve leave'
      );
    }
  };

  const handleReject = async (id) => {
    const rejectNotes = prompt('Enter rejection reason:');
    if (!rejectNotes) return;

    try {
      setError('');
      setSuccess('');
      await leaveAPI.reject(id, { notes: rejectNotes });
      setSuccess('Leave rejected successfully');
      await fetchLeaves();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to reject leave'
      );
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this leave?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await leaveAPI.cancel(id);
      setSuccess('Leave cancelled successfully');
      await fetchLeaves();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to cancel leave'
      );
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const filteredLeaves = leaves.filter((leave) => {
    const matchesSearch =
      leave.leaveType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.reason?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && leave.status === filterStatus;
  });

  const StatusBadge = ({ status }) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status}
      </span>
    );
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leaves</h1>
          <p className="text-gray-600 mt-1">Request and manage your leave</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          <Plus size={18} />
          Request Leave
        </button>
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

      {/* Leave Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {filteredLeaves.length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {filteredLeaves.filter((l) => l.status === 'pending').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {filteredLeaves.filter((l) => l.status === 'approved').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Rejected</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {filteredLeaves.filter((l) => l.status === 'rejected').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Leaves
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by type or reason..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leaves List */}
      {filteredLeaves.length > 0 ? (
        <div className="space-y-3">
          {filteredLeaves.map((leave) => {
            const days = calculateDays(leave.startDate, leave.endDate);

            return (
              <div
                key={leave._id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-5 h-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900 capitalize">
                        {leave.leaveType} Leave
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-600">From</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(leave.startDate).toLocaleDateString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600">To</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(leave.endDate).toLocaleDateString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600">Days</p>
                        <p className="text-sm font-medium text-gray-900">
                          {days} days
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600">Status</p>
                        <div className="mt-1">
                          <StatusBadge status={leave.status} />
                        </div>
                      </div>
                    </div>

                    {leave.reason && (
                      <p className="text-sm text-gray-600 mt-2">Reason: {leave.reason}</p>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    {leave.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleOpenModal(leave)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(leave._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}

                    {leave.status === 'approved' && (
                      <button
                        onClick={() => handleCancel(leave._id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                      >
                        Cancel Leave
                      </button>
                    )}

                    {(isManager || isAdmin) && leave.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(leave._id)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(leave._id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">
            {searchTerm || filterStatus !== 'all'
              ? 'No leaves match your filters'
              : 'No leave requests yet. Submit one to get started!'}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Leave' : 'Request Leave'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leave Type
                </label>
                <select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="casual">Casual Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                  />
                </div>
              </div>

              {formData.startDate && formData.endDate && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    Duration:{' '}
                    <span className="font-semibold">
                      {calculateDays(formData.startDate, formData.endDate)} days
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments (URLs, comma-separated)
                </label>
                <input
                  type="text"
                  name="attachments"
                  value={formData.attachments}
                  onChange={handleChange}
                  placeholder="https://example.com/doc1.pdf, https://example.com/doc2.pdf"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingId ? 'Update' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;
