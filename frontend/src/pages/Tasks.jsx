import React, { useState, useEffect } from 'react';
import { Plus, Filter, Calendar, List, LayoutGrid, Clock, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import { taskAPI } from '../services/api';
import { format } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter === 'today') params.dueDate = 'today';
      if (filter === 'overdue') params.dueDate = 'overdue';
      if (filter === 'week') params.dueDate = 'week';

      const { data } = await taskAPI.getMyTasks(params);
      setTasks(data.data.tasks);
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await taskAPI.update(taskId, { status });
      setTasks(tasks.map(t => t._id === taskId ? { ...t, status } : t));
      toast.success('Task updated');
    } catch (error) {
      toast.error('Failed to update task');
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-500">{tasks.length} tasks assigned to you</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded ${view === 'list' ? 'bg-white shadow' : ''}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setView('board')}
              className={`p-2 rounded ${view === 'board' ? 'bg-white shadow' : ''}`}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus size={20} />
            New Task
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'all', label: 'All Tasks' },
          { key: 'today', label: 'Due Today' },
          { key: 'week', label: 'This Week' },
          { key: 'overdue', label: 'Overdue' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === key
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'list' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-500">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <div
                  key={task._id}
                  className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4"
                  onClick={() => setSelectedTask(task)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(task._id, {
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
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {task.list && (
                        <span className="flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: task.list.color || '#6B7280' }}
                          />
                          {task.list.name}
                        </span>
                      )}
                      {task.space && <span>{task.space.name}</span>}
                    </div>
                  </div>

                  {task.dueDate && (
                    <div className={`flex items-center gap-1 text-sm ${
                      new Date(task.dueDate) < new Date() && !task.status?.isClosed
                        ? 'text-red-500'
                        : 'text-gray-500'
                    }`}>
                      <Calendar size={14} />
                      {format(new Date(task.dueDate), 'MMM d')}
                    </div>
                  )}

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
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(groupedTasks).map(([status, statusTasks]) => (
            <div key={status} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-700">{status}</h3>
                <span className="text-sm text-gray-500">{statusTasks.length}</span>
              </div>
              <div className="space-y-3">
                {statusTasks.map((task) => (
                  <div
                    key={task._id}
                    className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</span>
                      {task.priority && (
                        <AlertCircle size={14} className={getPriorityColor(task.priority.level)} />
                      )}
                    </div>
                    {task.dueDate && (
                      <div className={`flex items-center gap-1 text-xs ${
                        new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        <Calendar size={12} />
                        {format(new Date(task.dueDate), 'MMM d')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updatedTask) => {
            setTasks(tasks.map(t => t._id === updatedTask._id ? updatedTask : t));
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
};

const TaskDetailModal = ({ task, onClose, onUpdate }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data } = await taskAPI.update(task._id, { title, description });
      onUpdate(data.data.task);
      toast.success('Task updated');
    } catch (error) {
      toast.error('Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl font-bold text-gray-900 border-none focus:ring-0 p-0"
          />
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <span className="px-2 py-1 rounded" style={{ backgroundColor: task.status?.color + '20', color: task.status?.color }}>
              {task.status?.name}
            </span>
            {task.list && <span>in {task.list.name}</span>}
          </div>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              rows={4}
              placeholder="Add a description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={18} />
                {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className={getPriorityColor(task.priority?.level)} />
                <span>{task.priority?.name || 'Normal'}</span>
              </div>
            </div>
          </div>

          {task.assignees?.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Assignees</label>
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((assignee) => (
                  <div key={assignee.user?._id} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-medium text-purple-600">
                      {assignee.user?.firstName?.charAt(0)}
                    </div>
                    <span className="text-sm">{assignee.user?.firstName} {assignee.user?.lastName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {task.checklists?.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Checklists</label>
              {task.checklists.map((checklist) => (
                <div key={checklist.id} className="mb-4">
                  <h4 className="font-medium text-gray-800 mb-2">{checklist.name}</h4>
                  <div className="space-y-2">
                    {checklist.items.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.isCompleted}
                          onChange={() => {}}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className={item.isCompleted ? 'line-through text-gray-400' : ''}>{item.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const getPriorityColor = (level) => {
  switch (level) {
    case 4: return 'text-red-500';
    case 3: return 'text-orange-500';
    case 2: return 'text-blue-500';
    default: return 'text-gray-400';
  }
};

export default Tasks;
