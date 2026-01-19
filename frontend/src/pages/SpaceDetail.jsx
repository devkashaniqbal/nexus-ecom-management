import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Settings, MoreVertical, Trash2,
  ChevronRight, Search, LayoutGrid, List, Calendar as CalendarIcon,
  Filter, SortAsc, Clock, AlertCircle, CheckCircle2, Circle, Users,
  MessageSquare, Paperclip, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { spaceAPI, listAPI, taskAPI } from '../services/api';
import { format } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SpaceDetail = () => {
  const { workspaceId, spaceId } = useParams();
  const navigate = useNavigate();
  const [space, setSpace] = useState(null);
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchSpaceData();
  }, [spaceId]);

  useEffect(() => {
    if (selectedList) {
      fetchTasks(selectedList._id);
    }
  }, [selectedList]);

  const fetchSpaceData = async () => {
    try {
      setLoading(true);
      const [spaceRes, listsRes] = await Promise.all([
        spaceAPI.getById(workspaceId, spaceId),
        listAPI.getAll(workspaceId, spaceId)
      ]);
      setSpace(spaceRes.data.data.space);
      setLists(listsRes.data.data.lists);

      if (listsRes.data.data.lists.length > 0) {
        setSelectedList(listsRes.data.data.lists[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch space data');
      navigate(`/workspace/${workspaceId}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async (listId) => {
    try {
      const { data } = await taskAPI.getByList(workspaceId, spaceId, listId);
      setTasks(data.data.tasks);
    } catch (error) {
      toast.error('Failed to fetch tasks');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskAPI.update(taskId, { status: newStatus });
      setTasks(tasks.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      toast.success('Task updated');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeTask = tasks.find(t => t._id === active.id);
    const overTask = tasks.find(t => t._id === over.id);

    if (!activeTask || !overTask) return;

    const oldIndex = tasks.findIndex(t => t._id === active.id);
    const newIndex = tasks.findIndex(t => t._id === over.id);

    const newTasks = [...tasks];
    newTasks.splice(oldIndex, 1);
    newTasks.splice(newIndex, 0, activeTask);

    setTasks(newTasks);

    try {
      await taskAPI.reorder(selectedList._id, {
        taskId: active.id,
        newPosition: newIndex
      });
    } catch (error) {
      setTasks(tasks);
      toast.error('Failed to reorder tasks');
    }
  };

  const getPriorityColor = (level) => {
    switch (level) {
      case 4: return 'text-red-500';
      case 3: return 'text-orange-500';
      case 2: return 'text-blue-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    if (status?.isClosed) return <CheckCircle2 size={18} className="text-green-500" />;
    if (status?.name === 'In Progress') return <Clock size={18} className="text-blue-500" />;
    return <Circle size={18} className="text-gray-400" />;
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    const key = task.status?.name || 'To Do';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  if (loading) return <LoadingSpinner />;
  if (!space) return null;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span
            className="hover:text-purple-600 cursor-pointer"
            onClick={() => navigate(`/workspace/${workspaceId}`)}
          >
            {space.workspace?.name || 'Workspace'}
          </span>
          <ChevronRight size={14} />
          <span className="text-gray-900">{space.name}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">
              {selectedList?.name || space.name}
            </h1>
            {lists.length > 1 && (
              <select
                value={selectedList?._id || ''}
                onChange={(e) => setSelectedList(lists.find(l => l._id === e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
              >
                {lists.map((list) => (
                  <option key={list._id} value={list._id}>{list.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('list')}
                className={`p-2 rounded ${view === 'list' ? 'bg-white shadow' : ''}`}
                title="List view"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setView('board')}
                className={`p-2 rounded ${view === 'board' ? 'bg-white shadow' : ''}`}
                title="Board view"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`p-2 rounded ${view === 'calendar' ? 'bg-white shadow' : ''}`}
                title="Calendar view"
              >
                <CalendarIcon size={18} />
              </button>
            </div>

            <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <Filter size={18} />
              Filter
            </button>

            <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <SortAsc size={18} />
              Sort
            </button>

            <button
              onClick={() => setShowCreateTaskModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus size={18} />
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        {!selectedList ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No list selected</h3>
            <p className="text-gray-500">Select a list from the dropdown or create a new one</p>
          </div>
        ) : view === 'list' ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
                  <p className="text-gray-500 mb-4">Create your first task to get started</p>
                  <button
                    onClick={() => setShowCreateTaskModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add Task
                  </button>
                </div>
              ) : (
                <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
                  <div className="divide-y divide-gray-100">
                    {tasks.map((task) => (
                      <SortableTaskRow
                        key={task._id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        getPriorityColor={getPriorityColor}
                        getStatusIcon={getStatusIcon}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </div>
          </DndContext>
        ) : view === 'board' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(groupedTasks).map(([status, statusTasks]) => (
              <div key={status} className="bg-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-700">{status}</h3>
                  <span className="text-sm text-gray-500">{statusTasks.length}</span>
                </div>
                <div className="space-y-3">
                  {statusTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      getPriorityColor={getPriorityColor}
                    />
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(groupedTasks).length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-xl">
                <p className="text-gray-500">No tasks to display</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-center text-gray-500">Calendar view coming soon</p>
          </div>
        )}
      </div>

      {showCreateTaskModal && selectedList && (
        <CreateTaskModal
          listId={selectedList._id}
          workspaceId={workspaceId}
          spaceId={spaceId}
          statuses={space.statuses || selectedList.statuses || []}
          onClose={() => setShowCreateTaskModal(false)}
          onCreate={(task) => {
            setTasks([...tasks, task]);
            setShowCreateTaskModal(false);
          }}
        />
      )}
    </div>
  );
};

const SortableTaskRow = ({ task, onStatusChange, getPriorityColor, getStatusIcon }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 hover:bg-gray-50 cursor-grab active:cursor-grabbing flex items-center gap-4"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStatusChange(task._id, {
            id: task.status?.isClosed ? 'todo' : 'done',
            name: task.status?.isClosed ? 'To Do' : 'Done',
            isClosed: !task.status?.isClosed
          });
        }}
        className="flex-shrink-0"
      >
        {getStatusIcon(task.status)}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${task.status?.isClosed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.title}
          </span>
          {task.priority && (
            <AlertCircle size={14} className={getPriorityColor(task.priority.level)} />
          )}
        </div>
        {task.description && (
          <p className="text-xs text-gray-500 truncate mt-1">{task.description}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {task.assignees?.length > 0 && (
          <div className="flex -space-x-2">
            {task.assignees.slice(0, 3).map((assignee) => (
              <div
                key={assignee.user?._id}
                className="w-7 h-7 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs font-medium text-purple-600"
                title={`${assignee.user?.firstName} ${assignee.user?.lastName}`}
              >
                {assignee.user?.firstName?.charAt(0)}
              </div>
            ))}
            {task.assignees.length > 3 && (
              <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}

        {task.dueDate && (
          <div className={`flex items-center gap-1 text-sm ${
            new Date(task.dueDate) < new Date() && !task.status?.isClosed
              ? 'text-red-500'
              : 'text-gray-500'
          }`}>
            <CalendarIcon size={14} />
            {format(new Date(task.dueDate), 'MMM d')}
          </div>
        )}

        <div className="flex items-center gap-2 text-gray-400">
          {task.comments?.length > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <MessageSquare size={14} />
              {task.comments.length}
            </span>
          )}
          {task.attachments?.length > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <Paperclip size={14} />
              {task.attachments.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const TaskCard = ({ task, getPriorityColor }) => {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</span>
        {task.priority && (
          <AlertCircle size={14} className={`flex-shrink-0 ${getPriorityColor(task.priority.level)}`} />
        )}
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between">
        {task.dueDate && (
          <div className={`flex items-center gap-1 text-xs ${
            new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-gray-500'
          }`}>
            <CalendarIcon size={12} />
            {format(new Date(task.dueDate), 'MMM d')}
          </div>
        )}

        {task.assignees?.length > 0 && (
          <div className="flex -space-x-1">
            {task.assignees.slice(0, 2).map((assignee) => (
              <div
                key={assignee.user?._id}
                className="w-6 h-6 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs font-medium text-purple-600"
              >
                {assignee.user?.firstName?.charAt(0)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CreateTaskModal = ({ listId, workspaceId, spaceId, statuses, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        title,
        description,
        listId,
        priority: { level: priority, name: ['Low', 'Normal', 'High', 'Urgent'][priority - 1] }
      };
      if (dueDate) payload.dueDate = dueDate;

      const { data } = await taskAPI.create(workspaceId, spaceId, listId, payload);
      onCreate(data.data.task);
      toast.success('Task created successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Create Task</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="What needs to be done?"
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
              placeholder="Add more details..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value={1}>Low</option>
                <option value={2}>Normal</option>
                <option value={3}>High</option>
                <option value={4}>Urgent</option>
              </select>
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
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SpaceDetail;
