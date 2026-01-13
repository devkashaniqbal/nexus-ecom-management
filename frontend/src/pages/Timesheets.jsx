import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { timesheetAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Search,
  X,
  Clock,
} from 'lucide-react';

const Timesheets = () => {
  const { user, isManager, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    weekStartDate: '',
    weekEndDate: '',
    entries: [
      { day: 'Monday', hours: 8 },
      { day: 'Tuesday', hours: 8 },
      { day: 'Wednesday', hours: 8 },
      { day: 'Thursday', hours: 8 },
      { day: 'Friday', hours: 8 },
      { day: 'Saturday', hours: 0 },
      { day: 'Sunday', hours: 0 },
    ],
    notes: '',
  });

  useEffect(() => {
    fetchTimesheets();
  }, []);

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await timesheetAPI.getMy({
        limit: 50,
        skip: 0,
      });
      const dataArray = response.data?.data?.timesheets || response.data?.data || [];
      setTimesheets(Array.isArray(dataArray) ? dataArray : []);
    } catch (err) {
      setError('Failed to load timesheets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (timesheet = null) => {
    if (timesheet) {
      setEditingId(timesheet._id);
      setFormData({
        weekStartDate: timesheet.weekStartDate?.split('T')[0] || '',
        weekEndDate: timesheet.weekEndDate?.split('T')[0] || '',
        entries: timesheet.entries || formData.entries,
        notes: timesheet.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        weekStartDate: '',
        weekEndDate: '',
        entries: [
          { day: 'Monday', hours: 8 },
          { day: 'Tuesday', hours: 8 },
          { day: 'Wednesday', hours: 8 },
          { day: 'Thursday', hours: 8 },
          { day: 'Friday', hours: 8 },
          { day: 'Saturday', hours: 0 },
          { day: 'Sunday', hours: 0 },
        ],
        notes: '',
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

  const handleEntryChange = (index, hours) => {
    const newEntries = [...formData.entries];
    newEntries[index].hours = parseFloat(hours) || 0;
    setFormData((prev) => ({ ...prev, entries: newEntries }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setSuccess('');

      const submitData = {
        ...formData,
        entries: formData.entries.map((e) => ({
          day: e.day,
          hours: parseFloat(e.hours) || 0,
        })),
      };

      if (editingId) {
        await timesheetAPI.update(editingId, submitData);
        setSuccess('Timesheet updated successfully');
      } else {
        await timesheetAPI.create(submitData);
        setSuccess('Timesheet created successfully');
      }

      handleCloseModal();
      await fetchTimesheets();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to save timesheet'
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this timesheet?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await timesheetAPI.delete(id);
      setSuccess('Timesheet deleted successfully');
      await fetchTimesheets();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to delete timesheet'
      );
    }
  };

  const handleSubmitTimesheet = async (id) => {
    try {
      setError('');
      setSuccess('');
      await timesheetAPI.submit(id);
      setSuccess('Timesheet submitted successfully');
      await fetchTimesheets();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to submit timesheet'
      );
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const filteredTimesheets = timesheets.filter((ts) => {
    const matchesSearch =
      ts.userId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ts._id?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && ts.status === filterStatus;
  });

  const StatusBadge = ({ status }) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {status}
      </span>
    );
  };

  const totalHours = formData.entries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
          <p className="text-gray-600 mt-1">Track and submit your weekly hours</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          <Plus size={18} />
          New Timesheet
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search timesheets..."
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
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timesheets List */}
      {filteredTimesheets.length > 0 ? (
        <div className="space-y-4">
          {filteredTimesheets.map((timesheet) => {
            const totalHours = timesheet.entries?.reduce((sum, e) => sum + (e.hours || 0), 0) || 0;

            return (
              <div
                key={timesheet._id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-5 h-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        Week of{' '}
                        {new Date(timesheet.weekStartDate).toLocaleDateString()}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Total Hours: <span className="font-semibold">{totalHours}h</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={timesheet.status} />

                    {timesheet.status === 'draft' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(timesheet)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(timesheet._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Daily Hours Display */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {timesheet.entries?.map((entry, idx) => (
                    <div key={idx} className="text-center">
                      <p className="text-xs text-gray-600 mb-1">{entry.day}</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {entry.hours}h
                      </p>
                    </div>
                  ))}
                </div>

                {timesheet.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 font-medium mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{timesheet.notes}</p>
                  </div>
                )}

                {timesheet.status === 'draft' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSubmitTimesheet(timesheet._id)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                    >
                      Submit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">
            {searchTerm || filterStatus !== 'all'
              ? 'No timesheets match your filters'
              : 'No timesheets yet. Create one to get started!'}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Timesheet' : 'New Timesheet'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Week Start Date
                  </label>
                  <input
                    type="date"
                    name="weekStartDate"
                    value={formData.weekStartDate}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Week End Date
                  </label>
                  <input
                    type="date"
                    name="weekEndDate"
                    value={formData.weekEndDate}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                  />
                </div>
              </div>

              {/* Daily Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Daily Hours
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {formData.entries.map((entry, idx) => (
                    <div key={idx}>
                      <label className="block text-xs text-gray-600 mb-1">
                        {entry.day}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={entry.hours}
                        onChange={(e) =>
                          handleEntryChange(idx, e.target.value)
                        }
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-3 p-3 bg-primary-50 rounded-lg">
                  <p className="text-sm text-primary-900">
                    Total Hours: <span className="font-semibold">{totalHours}h</span>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
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
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timesheets;
