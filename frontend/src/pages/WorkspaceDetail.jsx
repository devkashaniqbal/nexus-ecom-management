import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Plus, Settings, Users, Folder, MoreVertical, Trash2, Archive,
  ChevronRight, Search, LayoutGrid, List, Star, Lock, Globe,
  FolderOpen, FileText, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { workspaceAPI, spaceAPI, folderAPI, listAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const WorkspaceDetail = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [expandedSpaces, setExpandedSpaces] = useState({});

  useEffect(() => {
    fetchWorkspaceData();
  }, [workspaceId]);

  const fetchWorkspaceData = async () => {
    try {
      setLoading(true);
      const [workspaceRes, spacesRes] = await Promise.all([
        workspaceAPI.getById(workspaceId),
        spaceAPI.getAll(workspaceId)
      ]);
      setWorkspace(workspaceRes.data.data.workspace);
      setSpaces(spacesRes.data.data.spaces);

      // Store current workspace in localStorage for other components
      localStorage.setItem('currentWorkspace', workspaceId);
    } catch (error) {
      toast.error('Failed to fetch workspace data');
      navigate('/workspaces');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpaceExpanded = (spaceId) => {
    setExpandedSpaces(prev => ({
      ...prev,
      [spaceId]: !prev[spaceId]
    }));
  };

  const handleDeleteSpace = async (spaceId) => {
    if (!window.confirm('Are you sure you want to delete this space?')) return;
    try {
      await spaceAPI.delete(workspaceId, spaceId);
      setSpaces(spaces.filter(s => s._id !== spaceId));
      toast.success('Space deleted');
    } catch (error) {
      toast.error('Failed to delete space');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!workspace) return null;

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar with Spaces */}
      <div className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: workspace.color || '#7C3AED' }}
            >
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 truncate">{workspace.name}</h2>
              <p className="text-xs text-gray-500">{spaces.length} spaces</p>
            </div>
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/settings`)}
              className="p-2 hover:bg-gray-200 rounded-lg"
            >
              <Settings size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search spaces..."
              className="w-full bg-white pl-10 pr-4 py-2 rounded-lg text-sm border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {spaces.map((space) => (
            <SpaceItem
              key={space._id}
              space={space}
              workspaceId={workspaceId}
              isExpanded={expandedSpaces[space._id]}
              onToggle={() => toggleSpaceExpanded(space._id)}
              onDelete={() => handleDeleteSpace(space._id)}
              onSelect={() => setSelectedSpace(space)}
              isSelected={selectedSpace?._id === space._id}
            />
          ))}

          {spaces.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Folder size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No spaces yet</p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => setShowCreateSpaceModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus size={18} />
            New Space
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {selectedSpace ? (
          <SpaceContent
            space={selectedSpace}
            workspaceId={workspaceId}
            onUpdate={(updatedSpace) => {
              setSpaces(spaces.map(s => s._id === updatedSpace._id ? updatedSpace : s));
              setSelectedSpace(updatedSpace);
            }}
          />
        ) : (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
                <p className="text-gray-500">{workspace.description || 'No description'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {spaces.map((space) => (
                <div
                  key={space._id}
                  onClick={() => setSelectedSpace(space)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: space.color || '#3B82F6' }}
                      >
                        {space.visibility === 'private' ? (
                          <Lock size={18} className="text-white" />
                        ) : (
                          <Globe size={18} className="text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{space.name}</h3>
                        <span className="text-xs text-gray-500 capitalize">{space.visibility}</span>
                      </div>
                    </div>
                    {space.isFavorite && <Star size={18} className="text-yellow-400 fill-yellow-400" />}
                  </div>

                  {space.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{space.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Folder size={14} />
                      {space.folders?.length || 0} folders
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {space.members?.length || 0} members
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreateSpaceModal && (
        <CreateSpaceModal
          workspaceId={workspaceId}
          onClose={() => setShowCreateSpaceModal(false)}
          onCreate={(space) => {
            setSpaces([...spaces, space]);
            setShowCreateSpaceModal(false);
          }}
        />
      )}
    </div>
  );
};

const SpaceItem = ({ space, workspaceId, isExpanded, onToggle, onDelete, onSelect, isSelected }) => {
  const [folders, setFolders] = useState([]);
  const [lists, setLists] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    if (isExpanded && folders.length === 0) {
      fetchSpaceContent();
    }
  }, [isExpanded]);

  const fetchSpaceContent = async () => {
    try {
      setLoadingContent(true);
      const [foldersRes, listsRes] = await Promise.all([
        folderAPI.getAll(workspaceId, space._id),
        listAPI.getAll(workspaceId, space._id)
      ]);
      setFolders(foldersRes.data.data.folders);
      setLists(listsRes.data.data.lists.filter(l => !l.folder));
    } catch (error) {
      console.error('Failed to fetch space content');
    } finally {
      setLoadingContent(false);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group ${
          isSelected ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
        }`}
      >
        <button onClick={onToggle} className="p-0.5">
          <ChevronDown
            size={16}
            className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`}
          />
        </button>
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-white text-xs"
          style={{ backgroundColor: space.color || '#3B82F6' }}
        >
          {space.name.charAt(0).toUpperCase()}
        </div>
        <span
          className="flex-1 text-sm font-medium truncate"
          onClick={onSelect}
        >
          {space.name}
        </span>
        <div className="opacity-0 group-hover:opacity-100 flex items-center">
          <button className="p-1 hover:bg-gray-200 rounded">
            <Plus size={14} />
          </button>
          <button className="p-1 hover:bg-gray-200 rounded" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 size={14} className="text-red-500" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="ml-4 pl-4 border-l border-gray-200">
          {loadingContent ? (
            <div className="py-2 text-xs text-gray-400">Loading...</div>
          ) : (
            <>
              {folders.map((folder) => (
                <FolderItem key={folder._id} folder={folder} />
              ))}
              {lists.map((list) => (
                <ListItem key={list._id} list={list} />
              ))}
              {folders.length === 0 && lists.length === 0 && (
                <div className="py-2 text-xs text-gray-400">Empty space</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const FolderItem = ({ folder }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronDown
          size={14}
          className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`}
        />
        <FolderOpen size={14} className="text-gray-400" />
        <span className="text-sm truncate">{folder.name}</span>
      </div>

      {isExpanded && folder.lists?.length > 0 && (
        <div className="ml-4 pl-4 border-l border-gray-200">
          {folder.lists.map((list) => (
            <ListItem key={list._id} list={list} />
          ))}
        </div>
      )}
    </div>
  );
};

const ListItem = ({ list }) => {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: list.color || '#6B7280' }}
      />
      <FileText size={14} className="text-gray-400" />
      <span className="text-sm truncate">{list.name}</span>
      <span className="text-xs text-gray-400">{list.taskCount || 0}</span>
    </div>
  );
};

const SpaceContent = ({ space, workspaceId, onUpdate }) => {
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);

  useEffect(() => {
    fetchContent();
  }, [space._id]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const [foldersRes, listsRes] = await Promise.all([
        folderAPI.getAll(workspaceId, space._id),
        listAPI.getAll(workspaceId, space._id)
      ]);
      setFolders(foldersRes.data.data.folders);
      setLists(listsRes.data.data.lists);
    } catch (error) {
      toast.error('Failed to fetch space content');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: space.color || '#3B82F6' }}
          >
            {space.visibility === 'private' ? (
              <Lock size={24} className="text-white" />
            ) : (
              <Globe size={24} className="text-white" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{space.name}</h1>
            <p className="text-gray-500">{space.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateFolderModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <FolderOpen size={18} />
            New Folder
          </button>
          <button
            onClick={() => setShowCreateListModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus size={18} />
            New List
          </button>
        </div>
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Folders</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders.map((folder) => (
              <div
                key={folder._id}
                className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <FolderOpen size={24} className="text-yellow-500" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{folder.name}</h3>
                    <p className="text-xs text-gray-500">{folder.lists?.length || 0} lists</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lists */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lists</h2>
        {lists.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No lists yet</h3>
            <p className="text-gray-500 mb-4">Create your first list to start organizing tasks</p>
            <button
              onClick={() => setShowCreateListModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Create List
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => (
              <div
                key={list._id}
                onClick={() => navigate(`/workspace/${workspaceId}/space/${space._id}/list/${list._id}`)}
                className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: list.color || '#6B7280' }}
                  />
                  <h3 className="font-medium text-gray-900">{list.name}</h3>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{list.taskCount || 0} tasks</span>
                  {list.folder && (
                    <span className="flex items-center gap-1">
                      <Folder size={12} />
                      {list.folder.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateFolderModal && (
        <CreateFolderModal
          workspaceId={workspaceId}
          spaceId={space._id}
          onClose={() => setShowCreateFolderModal(false)}
          onCreate={(folder) => {
            setFolders([...folders, folder]);
            setShowCreateFolderModal(false);
          }}
        />
      )}

      {showCreateListModal && (
        <CreateListModal
          workspaceId={workspaceId}
          spaceId={space._id}
          folders={folders}
          onClose={() => setShowCreateListModal(false)}
          onCreate={(list) => {
            setLists([...lists, list]);
            setShowCreateListModal(false);
          }}
        />
      )}
    </div>
  );
};

const CreateSpaceModal = ({ workspaceId, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [visibility, setVisibility] = useState('public');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data } = await spaceAPI.create(workspaceId, { name, description, color, visibility });
      onCreate(data.data.space);
      toast.success('Space created successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create space');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create Space</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Marketing"
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
              placeholder="What's this space for?"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="text-purple-600"
                />
                <Globe size={16} />
                Public
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="text-purple-600"
                />
                <Lock size={16} />
                Private
              </label>
            </div>
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
              {loading ? 'Creating...' : 'Create Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateFolderModal = ({ workspaceId, spaceId, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data } = await folderAPI.create(workspaceId, spaceId, { name });
      onCreate(data.data.folder);
      toast.success('Folder created successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create Folder</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Q1 Campaigns"
              required
            />
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
              {loading ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateListModal = ({ workspaceId, spaceId, folders, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState('');
  const [color, setColor] = useState('#6B7280');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = { name, color };
      if (folderId) payload.folderId = folderId;
      const { data } = await listAPI.create(workspaceId, spaceId, payload);
      onCreate(data.data.list);
      toast.success('List created successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create List</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Tasks"
              required
            />
          </div>
          {folders.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Folder (optional)</label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">No folder</option>
                {folders.map((folder) => (
                  <option key={folder._id} value={folder._id}>{folder.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex gap-2">
              {['#6B7280', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'].map((c) => (
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
              {loading ? 'Creating...' : 'Create List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkspaceDetail;
