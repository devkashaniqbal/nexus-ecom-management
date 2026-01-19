import React, { useState, useEffect } from 'react';
import { Plus, Users, MessageSquare, Settings, MoreVertical, Trash2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { teamAPI, userAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data } = await teamAPI.getMyTeams();
      setTeams(data.data.teams);
    } catch (error) {
      toast.error('Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;
    try {
      await teamAPI.delete(id);
      setTeams(teams.filter(t => t._id !== id));
      toast.success('Team deleted');
    } catch (error) {
      toast.error('Failed to delete team');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-500">Manage your teams and collaboration</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus size={20} />
          New Team
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <div
            key={team._id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                    style={{ backgroundColor: team.color || '#3B82F6' }}
                  >
                    {team.avatar ? (
                      <img src={team.avatar} alt={team.name} className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      team.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    <span className="text-xs text-gray-500 capitalize">{team.type}</span>
                  </div>
                </div>
                <div className="relative group">
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <MoreVertical size={18} className="text-gray-500" />
                  </button>
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 hidden group-hover:block z-10">
                    <button
                      onClick={() => { setSelectedTeam(team); setShowAddMemberModal(true); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <UserPlus size={16} /> Add Member
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team._id)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              </div>

              {team.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{team.description}</p>
              )}

              <div className="flex items-center gap-2 mb-4">
                <div className="flex -space-x-2">
                  {team.members?.slice(0, 5).map((member, index) => (
                    <div
                      key={member.user?._id || `member-${index}`}
                      className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs font-medium text-purple-600"
                      title={`${member.user?.firstName} ${member.user?.lastName}`}
                    >
                      {member.user?.profileImage ? (
                        <img src={member.user.profileImage} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        member.user?.firstName?.charAt(0)
                      )}
                    </div>
                  ))}
                  {team.members?.length > 5 && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                      +{team.members.length - 5}
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-500">{team.members?.length || 0} members</span>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                  {team.workspace?.name}
                </span>
                {team.lead && (
                  <span className="text-xs text-gray-500">
                    Lead: {team.lead.firstName} {team.lead.lastName}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {teams.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
            <p className="text-gray-500 mb-4">Create your first team to start collaborating</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Create Team
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(team) => {
            setTeams([team, ...teams]);
            setShowCreateModal(false);
          }}
        />
      )}

      {showAddMemberModal && selectedTeam && (
        <AddMemberModal
          team={selectedTeam}
          onClose={() => { setShowAddMemberModal(false); setSelectedTeam(null); }}
          onAdd={() => fetchTeams()}
        />
      )}
    </div>
  );
};

const CreateTeamModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('custom');
  const [color, setColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data } = await teamAPI.create({
        name,
        description,
        type,
        color,
        workspaceId: localStorage.getItem('currentWorkspace')
      });
      onCreate(data.data.team);
      toast.success('Team created successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create Team</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Marketing Team"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              rows={3}
              placeholder="What's this team for?"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="custom">Custom</option>
              <option value="department">Department</option>
              <option value="project">Project</option>
              <option value="cross_functional">Cross-functional</option>
            </select>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex gap-2">
              {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddMemberModal = ({ team, onClose, onAdd }) => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await userAPI.getAll();
      const teamMemberIds = team.members.map(m => m.user?._id);
      setUsers(data.data.users.filter(u => !teamMemberIds.includes(u._id)));
    } catch (error) {
      toast.error('Failed to fetch users');
    }
  };

  const handleAddMember = async (userId) => {
    try {
      setLoading(true);
      await teamAPI.addMember(team._id, { userId });
      toast.success('Member added');
      onAdd();
      onClose();
    } catch (error) {
      toast.error('Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Member to {team.name}</h2>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
          placeholder="Search users..."
        />
        <div className="max-h-64 overflow-y-auto space-y-2">
          {filteredUsers.map((user) => (
            <div
              key={user._id}
              className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium">
                  {user.firstName?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleAddMember(user._id)}
                disabled={loading}
                className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
              >
                Add
              </button>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <p className="text-center text-gray-500 py-4">No users found</p>
          )}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Teams;
