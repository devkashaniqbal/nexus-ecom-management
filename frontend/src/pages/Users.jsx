import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, authAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Users,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  Search,
  Eye,
  Plus,
  X,
  UserPlus,
} from 'lucide-react';

const UsersManagement = () => {
  const { user, isAdmin, isManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    employeeId: '',
    department: 'Engineering',
    designation: '',
    role: 'employee',
    phone: '',
    dateOfJoining: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!isManager && !isAdmin) {
      return;
    }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await userAPI.getAll({
        limit: 100,
        skip: 0,
      });
      const dataArray = response.data?.data?.users || response.data?.data || [];
      setUsers(Array.isArray(dataArray) ? dataArray : []);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await userAPI.delete(id);
      setSuccess('User deleted successfully');
      await fetchUsers();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to delete user'
      );
    }
  };

  const handleViewDetails = (userData) => {
    setSelectedUser(userData);
    setShowDetails(true);
  };

  const handleOpenAddModal = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      employeeId: '',
      department: 'Engineering',
      designation: '',
      role: 'employee',
      phone: '',
      dateOfJoining: new Date().toISOString().split('T')[0],
    });
    setShowAddModal(true);
    setError('');
    setSuccess('');
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      employeeId: '',
      department: 'Engineering',
      designation: '',
      role: 'employee',
      phone: '',
      dateOfJoining: new Date().toISOString().split('T')[0],
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({
      ...prev,
      password: password,
    }));
  };

  const handleSubmitEmployee = async (e) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.employeeId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      await authAPI.register(formData);

      setSuccess(`Employee added successfully! Username: ${formData.email}, Password: ${formData.password}`);

      setTimeout(() => {
        handleCloseAddModal();
        fetchUsers();
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add employee');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isManager && !isAdmin) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
        <p className="text-gray-600">
          You don't have permission to access this page
        </p>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  const filteredUsers = users.filter((userData) => {
    const matchesSearch =
      userData.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userData.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userData.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterRole !== 'all' && userData.role !== filterRole) {
      return false;
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && !userData.isActive) return false;
      if (filterStatus === 'inactive' && userData.isActive) return false;
    }

    return matchesSearch;
  });

  const RoleBadge = ({ role }) => {
    const styles = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      employee: 'bg-green-100 text-green-800',
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          styles[role] || styles.employee
        }`}
      >
        {role}
      </span>
    );
  };

  const StatusBadge = ({ isActive }) => (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        isActive
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage employees and their permissions</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            <Plus size={18} />
            Add Employee
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

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {users.length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Admins</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {users.filter((u) => u.role === 'admin').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Managers</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {users.filter((u) => u.role === 'manager').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Active Users</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {users.filter((u) => u.isActive).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">
                    Department
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">
                    Joined
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((userData) => (
                  <tr
                    key={userData._id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {userData.firstName} {userData.lastName}
                        </p>
                        {userData.employeeId && (
                          <p className="text-xs text-gray-500">
                            ID: {userData.employeeId}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {userData.email}
                    </td>
                    <td className="py-3 px-4">
                      <RoleBadge role={userData.role} />
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {userData.department || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge isActive={userData.isActive} />
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(userData.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(userData)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>

                        {isAdmin && userData.role !== 'admin' && (
                          <>
                            <button
                              onClick={() => handleDeleteUser(userData._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete User"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
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
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">
            {searchTerm || filterRole !== 'all' || filterStatus !== 'all'
              ? 'No users match your filters'
              : 'No users found'}
          </p>
        </div>
      )}

      {/* User Details Modal */}
      {showDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">User Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start gap-4 pb-4 border-b border-gray-200">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-8 h-8 text-primary-600" />
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <RoleBadge role={selectedUser.role} />
                    <StatusBadge isActive={selectedUser.isActive} />
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">First Name</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedUser.firstName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600">Last Name</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedUser.lastName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600">Email</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedUser.email}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600">Phone</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedUser.phone || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Employment Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Employee ID</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedUser.employeeId || '-'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600">Department</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedUser.department || '-'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600">Role</p>
                    <p className="text-sm font-medium text-gray-900 mt-1 capitalize">
                      {selectedUser.role}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600">Joined Date</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              {(selectedUser.phone || selectedUser.address) && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Contact Information
                  </h4>
                  <div className="space-y-2">
                    {selectedUser.phone && (
                      <p className="text-sm text-gray-900">
                        Phone: {selectedUser.phone}
                      </p>
                    )}
                    {selectedUser.address && (
                      <p className="text-sm text-gray-900">
                        Address: {selectedUser.address}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserPlus className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-900">Add New Employee</h2>
              </div>
              <button
                onClick={handleCloseAddModal}
                className="text-gray-600 hover:text-gray-900"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitEmployee} className="p-6">
              {/* Messages */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}

              <div className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        First Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="input"
                        required
                      />
                    </div>

                    <div>
                      <label className="label">
                        Last Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="input"
                        required
                      />
                    </div>

                    <div>
                      <label className="label">
                        Employee ID <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        name="employeeId"
                        value={formData.employeeId}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="EMP001"
                        required
                      />
                    </div>

                    <div>
                      <label className="label">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>
                </div>

                {/* Login Credentials */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Login Credentials</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="label">
                        Email (Username) <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="employee@company.com"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">This will be used to login</p>
                    </div>

                    <div>
                      <label className="label">
                        Password <span className="text-red-600">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="input flex-1"
                          placeholder="Minimum 8 characters"
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 whitespace-nowrap"
                        >
                          Generate
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Employee can change this later</p>
                    </div>
                  </div>
                </div>

                {/* Employment Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        Department <span className="text-red-600">*</span>
                      </label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="input"
                        required
                      >
                        <option value="Engineering">Engineering</option>
                        <option value="Design">Design</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Sales">Sales</option>
                        <option value="HR">HR</option>
                        <option value="Finance">Finance</option>
                        <option value="Operations">Operations</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">
                        Designation <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Software Developer"
                        required
                      />
                    </div>

                    <div>
                      <label className="label">
                        Role <span className="text-red-600">*</span>
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="input"
                        required
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        {isAdmin && <option value="admin">Admin</option>}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.role === 'admin' && 'Full system access'}
                        {formData.role === 'manager' && 'Can manage team and approve requests'}
                        {formData.role === 'employee' && 'Standard employee access'}
                      </p>
                    </div>

                    <div>
                      <label className="label">
                        Date of Joining <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        name="dateOfJoining"
                        value={formData.dateOfJoining}
                        onChange={handleInputChange}
                        className="input"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Adding Employee...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
