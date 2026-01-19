import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Users, Folder, MoreVertical, Trash2, Archive, Link } from 'lucide-react';
import toast from 'react-hot-toast';
import { workspaceAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Workspaces = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '', color: '#7C3AED' });

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const { data } = await workspaceAPI.getAll();
      setWorkspaces(data.data.workspaces);
    } catch (error) {
      toast.error('Failed to fetch workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    try {
      const { data } = await workspaceAPI.create(newWorkspace);
      setWorkspaces([data.data.workspace, ...workspaces]);
      setShowCreateModal(false);
      setNewWorkspace({ name: '', description: '', color: '#7C3AED' });
      toast.success('Workspace created successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create workspace');
    }
  };

  const handleDeleteWorkspace = async (id) => {
    if (!window.confirm('Are you sure you want to delete this workspace?')) return;
    try {
      await workspaceAPI.delete(id);
      setWorkspaces(workspaces.filter(w => w._id !== id));
      toast.success('Workspace deleted');
    } catch (error) {
      toast.error('Failed to delete workspace');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus size={20} />
          New Workspace
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((workspace) => (
          <div
            key={workspace._id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div
              className="h-2"
              style={{ backgroundColor: workspace.color || '#7C3AED' }}
            />
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: workspace.color || '#7C3AED' }}
                >
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <div className="relative group">
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <MoreVertical size={18} className="text-gray-500" />
                  </button>
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 hidden group-hover:block z-10">
                    <button
                      onClick={() => navigate(`/workspace/${workspace._id}/settings`)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Settings size={16} /> Settings
                    </button>
                    <button
                      onClick={() => handleDeleteWorkspace(workspace._id)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              </div>

              <h3
                className="text-lg font-semibold text-gray-900 mb-1 cursor-pointer hover:text-purple-600"
                onClick={() => navigate(`/workspace/${workspace._id}`)}
              >
                {workspace.name}
              </h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {workspace.description || 'No description'}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Users size={16} />
                    {workspace.usage?.membersCount || workspace.members?.length || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Folder size={16} />
                    {workspace.usage?.spacesCount || 0}
                  </span>
                </div>
                <span className="px-2 py-1 bg-gray-100 rounded text-xs capitalize">
                  {workspace.plan || 'free'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {workspaces.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Folder size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workspaces yet</h3>
            <p className="text-gray-500 mb-4">Create your first workspace to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Create Workspace
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Workspace</h2>
            <form onSubmit={handleCreateWorkspace}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newWorkspace.name}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="My Workspace"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newWorkspace.description}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="What's this workspace for?"
                  rows={3}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex gap-2">
                  {['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewWorkspace({ ...newWorkspace, color })}
                      className={`w-8 h-8 rounded-full ${newWorkspace.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspaces;
