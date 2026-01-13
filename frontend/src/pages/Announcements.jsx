import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { announcementAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  Search,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';

const Announcements = () => {
  const { user, isManager, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRead, setFilterRead] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await announcementAPI.getAll({
        limit: 50,
        skip: 0,
      });
      const dataArray = response.data?.data?.announcements || response.data?.data || [];
      setAnnouncements(Array.isArray(dataArray) ? dataArray : []);
    } catch (err) {
      setError('Failed to load announcements');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (announcement = null) => {
    if (announcement) {
      setEditingId(announcement._id);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority || 'normal',
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        content: '',
        priority: 'normal',
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

      if (editingId) {
        await announcementAPI.update(editingId, formData);
        setSuccess('Announcement updated successfully');
      } else {
        await announcementAPI.create(formData);
        setSuccess('Announcement created successfully');
      }

      handleCloseModal();
      await fetchAnnouncements();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to save announcement'
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await announcementAPI.delete(id);
      setSuccess('Announcement deleted successfully');
      await fetchAnnouncements();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to delete announcement'
      );
    }
  };

  const handleMarkAsRead = async (id, isRead) => {
    try {
      setError('');
      if (isRead) {
        await announcementAPI.markUnread(id);
      } else {
        await announcementAPI.markRead(id);
      }
      await fetchAnnouncements();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to update announcement'
      );
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const filteredAnnouncements = announcements.filter((announcement) => {
    const matchesSearch =
      announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.content?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterRead === 'all') return matchesSearch;
    if (filterRead === 'unread') return matchesSearch && !announcement.readBy?.includes(user._id);
    if (filterRead === 'read') return matchesSearch && announcement.readBy?.includes(user._id);
    return matchesSearch;
  });

  const PriorityBadge = ({ priority }) => {
    const styles = {
      low: 'bg-blue-100 text-blue-800',
      normal: 'bg-gray-100 text-gray-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[priority] || styles.normal}`}>
        {priority}
      </span>
    );
  };

  const unreadCount = announcements.filter(
    (a) => !a.readBy?.includes(user._id)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-600 mt-1">Stay updated with company announcements</p>
        </div>

        {(isManager || isAdmin) && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            <Plus size={18} />
            New Announcement
          </button>
        )}
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

      {/* Unread Count */}
      {unreadCount > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-900">
              You have <span className="font-semibold">{unreadCount}</span> unread
              announcement{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Announcements
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search announcements..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter
            </label>
            <select
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="all">All Announcements</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      {filteredAnnouncements.length > 0 ? (
        <div className="space-y-3">
          {filteredAnnouncements.map((announcement) => {
            const isRead = announcement.readBy?.includes(user._id);

            return (
              <div
                key={announcement._id}
                className={`rounded-lg shadow hover:shadow-md transition-shadow p-6 border-l-4 ${
                  isRead
                    ? 'bg-white border-l-gray-200'
                    : 'bg-blue-50 border-l-blue-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {!isRead && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                      )}
                      <h3 className={`text-lg font-semibold ${isRead ? 'text-gray-900' : 'text-blue-900'}`}>
                        {announcement.title}
                      </h3>
                    </div>

                    <p className={`text-sm ${isRead ? 'text-gray-600' : 'text-blue-800'}`}>
                      {announcement.content}
                    </p>

                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <PriorityBadge priority={announcement.priority} />

                      <p className={`text-xs ${isRead ? 'text-gray-500' : 'text-blue-700'}`}>
                        Posted on{' '}
                        {new Date(announcement.createdAt).toLocaleDateString()} at{' '}
                        {new Date(announcement.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>

                      {announcement.author && (
                        <p className={`text-xs ${isRead ? 'text-gray-500' : 'text-blue-700'}`}>
                          By {announcement.author.firstName}{' '}
                          {announcement.author.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    <button
                      onClick={() =>
                        handleMarkAsRead(announcement._id, isRead)
                      }
                      className={`p-2 rounded-lg ${
                        isRead
                          ? 'text-gray-600 hover:bg-gray-100'
                          : 'text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      {isRead ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>

                    {(isManager || isAdmin) && (
                      <>
                        <button
                          onClick={() => handleOpenModal(announcement)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
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
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">
            {searchTerm || filterRead !== 'all'
              ? 'No announcements match your filters'
              : 'No announcements yet'}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Announcement' : 'New Announcement'}
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
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  required
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
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
                  {editingId ? 'Update' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
