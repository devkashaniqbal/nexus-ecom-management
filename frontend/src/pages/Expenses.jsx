import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { expenseAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';

const Expenses = () => {
  const { user, isManager, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    category: 'travel',
    amount: '',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    receipt: '',
    notes: '',
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await expenseAPI.getMy({
        limit: 50,
        skip: 0,
      });
      const dataArray = response.data?.data?.expenses || response.data?.data || [];
      setExpenses(Array.isArray(dataArray) ? dataArray : []);
    } catch (err) {
      setError('Failed to load expenses');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (expense = null) => {
    if (expense) {
      setEditingId(expense._id);
      setFormData({
        description: expense.description,
        category: expense.category,
        amount: expense.amount,
        currency: expense.currency,
        date: expense.date?.split('T')[0] || '',
        receipt: expense.receipt || '',
        notes: expense.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        description: '',
        category: 'travel',
        amount: '',
        currency: 'USD',
        date: new Date().toISOString().split('T')[0],
        receipt: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setSuccess('');

      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (editingId) {
        await expenseAPI.update(editingId, submitData);
        setSuccess('Expense updated successfully');
      } else {
        await expenseAPI.create(submitData);
        setSuccess('Expense submitted successfully');
      }

      handleCloseModal();
      await fetchExpenses();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to save expense'
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await expenseAPI.delete(id);
      setSuccess('Expense deleted successfully');
      await fetchExpenses();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to delete expense'
      );
    }
  };

  const handleApprove = async (id) => {
    try {
      setError('');
      setSuccess('');
      await expenseAPI.approve(id, { notes: '' });
      setSuccess('Expense approved successfully');
      await fetchExpenses();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to approve expense'
      );
    }
  };

  const handleReject = async (id) => {
    const rejectNotes = prompt('Enter rejection reason:');
    if (!rejectNotes) return;

    try {
      setError('');
      setSuccess('');
      await expenseAPI.reject(id, { notes: rejectNotes });
      setSuccess('Expense rejected successfully');
      await fetchExpenses();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to reject expense'
      );
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && expense.status === filterStatus;
  });

  const StatusBadge = ({ status }) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status}
      </span>
    );
  };

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600 mt-1">Track and manage your expenses</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          <Plus size={18} />
          New Expense
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${totalAmount.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Pending Approval</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {filteredExpenses.filter((e) => e.status === 'pending').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {filteredExpenses.filter((e) => e.status === 'approved').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Expenses
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by description or category..."
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
            </select>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length > 0 ? (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <div
              key={expense._id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-primary-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {expense.description}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-gray-600">Category</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {expense.category}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600">Amount</p>
                      <p className="text-sm font-medium text-gray-900">
                        {expense.currency} {expense.amount.toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600">Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600">Status</p>
                      <div className="mt-1">
                        <StatusBadge status={expense.status} />
                      </div>
                    </div>
                  </div>

                  {expense.notes && (
                    <p className="text-sm text-gray-600 mt-2">Notes: {expense.notes}</p>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  {expense.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleOpenModal(expense)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(expense._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}

                  {(isManager || isAdmin) && expense.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(expense._id)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(expense._id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">
            {searchTerm || filterStatus !== 'all'
              ? 'No expenses match your filters'
              : 'No expenses yet. Submit one to get started!'}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Expense' : 'New Expense'}
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
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="travel">Travel</option>
                  <option value="meals">Meals</option>
                  <option value="supplies">Supplies</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="PKR">PKR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receipt/Invoice
                </label>
                <input
                  type="text"
                  name="receipt"
                  value={formData.receipt}
                  onChange={handleChange}
                  placeholder="Receipt URL or number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="2"
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

export default Expenses;
