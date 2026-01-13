import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { aiAgentAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  BookOpen,
  Plus,
  Trash2,
  Edit,
  Search,
  X,
  FileText,
  Brain,
  Sparkles,
  Download,
  Upload,
  BarChart3,
  History,
} from 'lucide-react';

const AIAgent = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'knowledge', 'analytics', 'history'
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [knowledgeForm, setKnowledgeForm] = useState({
    title: '',
    content: '',
    category: 'documentation',
    tags: '',
  });
  const [editingKnowledge, setEditingKnowledge] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [sessions, setSessions] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'knowledge') {
      fetchKnowledgeBase();
    } else if (activeTab === 'analytics' && user?.role === 'admin') {
      fetchAnalytics();
    } else if (activeTab === 'history') {
      fetchSessions();
    }
  }, [activeTab]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchKnowledgeBase = async () => {
    try {
      setLoading(true);
      const response = await aiAgentAPI.getKnowledge({ search: searchQuery });
      const knowledgeData = response.data?.data?.knowledge || [];
      setKnowledgeBase(Array.isArray(knowledgeData) ? knowledgeData : []);
    } catch (err) {
      console.error('Failed to fetch knowledge base:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputMessage('');
    setSending(true);

    try {
      const response = await aiAgentAPI.chat({
        message: inputMessage,
        sessionId,
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data?.data?.message || 'Sorry, I could not generate a response.',
        sources: response.data?.data?.sources || [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setSessionId(response.data?.data?.sessionId);
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const handleAddKnowledge = async (e) => {
    e.preventDefault();
    try {
      await aiAgentAPI.addKnowledge(knowledgeForm);
      setShowAddKnowledge(false);
      setKnowledgeForm({
        title: '',
        content: '',
        category: 'documentation',
        tags: '',
      });
      fetchKnowledgeBase();
    } catch (err) {
      console.error('Failed to add knowledge:', err);
      alert(err.response?.data?.message || 'Failed to add knowledge');
    }
  };

  const handleUpdateKnowledge = async (e) => {
    e.preventDefault();
    try {
      await aiAgentAPI.updateKnowledge(editingKnowledge._id, knowledgeForm);
      setEditingKnowledge(null);
      setKnowledgeForm({
        title: '',
        content: '',
        category: 'documentation',
        tags: '',
      });
      fetchKnowledgeBase();
    } catch (err) {
      console.error('Failed to update knowledge:', err);
      alert(err.response?.data?.message || 'Failed to update knowledge');
    }
  };

  const handleDeleteKnowledge = async (id) => {
    if (!window.confirm('Are you sure you want to delete this knowledge entry?')) return;

    try {
      await aiAgentAPI.deleteKnowledge(id);
      fetchKnowledgeBase();
    } catch (err) {
      console.error('Failed to delete knowledge:', err);
      alert(err.response?.data?.message || 'Failed to delete knowledge');
    }
  };

  const handleEditKnowledge = (knowledge) => {
    setEditingKnowledge(knowledge);
    setKnowledgeForm({
      title: knowledge.title,
      content: knowledge.content,
      category: knowledge.category,
      tags: knowledge.tags?.join(', ') || '',
    });
    setShowAddKnowledge(true);
  };

  const resetForm = () => {
    setShowAddKnowledge(false);
    setEditingKnowledge(null);
    setKnowledgeForm({
      title: '',
      content: '',
      category: 'documentation',
      tags: '',
    });
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await aiAgentAPI.getAnalytics();
      setAnalytics(response.data?.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await aiAgentAPI.getAllSessions();
      const sessionsData = response.data?.data?.sessions || [];
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportChat = async () => {
    if (!sessionId) {
      alert('No active session to export');
      return;
    }

    try {
      const response = await aiAgentAPI.exportChatHistory(sessionId);
      const exportData = response.data?.data?.export;

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat-${sessionId}-${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export chat:', err);
      alert('Failed to export chat history');
    }
  };

  const handleBulkImport = async () => {
    try {
      const lines = bulkImportText.trim().split('\n');
      const entries = [];

      for (const line of lines) {
        if (!line.trim()) continue;

        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 3) {
          entries.push({
            title: parts[0],
            category: parts[1],
            content: parts[2],
            tags: parts[3] ? parts[3].split(',').map(t => t.trim()) : [],
          });
        }
      }

      if (entries.length === 0) {
        alert('No valid entries found. Format: Title | Category | Content | Tags');
        return;
      }

      await aiAgentAPI.bulkImportKnowledge({ entries });
      alert(`Successfully imported ${entries.length} knowledge entries`);
      setShowBulkImport(false);
      setBulkImportText('');
      fetchKnowledgeBase();
    } catch (err) {
      console.error('Failed to bulk import:', err);
      alert(err.response?.data?.message || 'Failed to import knowledge');
    }
  };

  const loadSession = async (sessionIdToLoad) => {
    try {
      const response = await aiAgentAPI.getChatHistory(sessionIdToLoad);
      const session = response.data?.data?.session;

      if (session && session.messages) {
        setMessages(session.messages);
        setSessionId(sessionIdToLoad);
        setActiveTab('chat');
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      alert('Failed to load chat session');
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      project: 'bg-blue-100 text-blue-800',
      documentation: 'bg-green-100 text-green-800',
      policy: 'bg-purple-100 text-purple-800',
      process: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.other;
  };

  if (loading && messages.length === 0 && knowledgeBase.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary-600" />
            Nexus Ecom AI Agent
          </h1>
          <p className="text-gray-600 mt-1">
            Ask questions about projects, documentation, and company knowledge
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'chat'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <MessageSquare size={18} />
          Chat
        </button>
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'knowledge'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <BookOpen size={18} />
          Knowledge Base
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <History size={18} />
          Chat History
        </button>
        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'analytics'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 size={18} />
            Analytics
          </button>
        )}
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-lg shadow">
          {/* Messages Area */}
          <div className="h-[600px] flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Sparkles className="w-16 h-16 text-primary-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Welcome to Nexus Ecom AI Agent
                  </h3>
                  <p className="text-gray-600 max-w-md">
                    I'm here to help you with information about projects, documentation,
                    policies, and processes. Ask me anything about Nexus Ecom!
                  </p>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
                    <button
                      onClick={() => setInputMessage('What projects are currently active?')}
                      className="p-3 text-left border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">Active Projects</p>
                      <p className="text-xs text-gray-500">View current project status</p>
                    </button>
                    <button
                      onClick={() => setInputMessage('Tell me about company policies')}
                      className="p-3 text-left border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">Company Policies</p>
                      <p className="text-xs text-gray-500">Learn about our guidelines</p>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <Bot size={18} className="text-primary-600" />
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] rounded-lg p-4 ${
                          msg.role === 'user'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-300">
                            <p className="text-xs font-medium mb-2 text-gray-700">Sources:</p>
                            <div className="space-y-1">
                              {msg.sources.map((source, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs flex items-center gap-2 text-gray-600"
                                >
                                  <FileText size={12} />
                                  <span>{source.title}</span>
                                  <span className="text-gray-400">
                                    ({source.category})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User size={18} className="text-gray-600" />
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                {messages.length > 0 && (
                  <button
                    onClick={handleExportChat}
                    className="text-sm text-gray-600 hover:text-primary-600 flex items-center gap-1"
                  >
                    <Download size={16} />
                    Export Chat
                  </button>
                )}
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me anything about Nexus Ecom..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !inputMessage.trim()}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send size={18} />
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Base Tab */}
      {activeTab === 'knowledge' && (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchKnowledgeBase()}
                placeholder="Search knowledge base..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
            <button
              onClick={fetchKnowledgeBase}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Search
            </button>
            {user?.role === 'admin' && (
              <>
                <button
                  onClick={() => setShowBulkImport(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Upload size={18} />
                  Bulk Import
                </button>
                <button
                  onClick={() => setShowAddKnowledge(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Knowledge
                </button>
              </>
            )}
          </div>

          {/* Knowledge List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeBase.map((item) => (
              <div key={item._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                  </div>
                  {user?.role === 'admin' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditKnowledge(item)}
                        className="text-gray-400 hover:text-primary-600"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteKnowledge(item._id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-3 mb-3">{item.content}</p>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  Added by {item.uploadedBy?.firstName} {item.uploadedBy?.lastName} •{' '}
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {knowledgeBase.length === 0 && !loading && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No knowledge entries found
              </h3>
              <p className="text-gray-600 mb-4">
                Start building the knowledge base to train the AI agent
              </p>
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <button
                  onClick={() => setShowAddKnowledge(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add First Entry
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Knowledge Modal */}
      {showAddKnowledge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingKnowledge ? 'Edit Knowledge Entry' : 'Add Knowledge Entry'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={editingKnowledge ? handleUpdateKnowledge : handleAddKnowledge}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={knowledgeForm.title}
                      onChange={(e) => setKnowledgeForm({ ...knowledgeForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={knowledgeForm.category}
                      onChange={(e) => setKnowledgeForm({ ...knowledgeForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                      required
                    >
                      <option value="project">Project</option>
                      <option value="documentation">Documentation</option>
                      <option value="policy">Policy</option>
                      <option value="process">Process</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content *
                    </label>
                    <textarea
                      value={knowledgeForm.content}
                      onChange={(e) => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={knowledgeForm.tags}
                      onChange={(e) => setKnowledgeForm({ ...knowledgeForm, tags: e.target.value })}
                      placeholder="e.g., react, frontend, api"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    {editingKnowledge ? 'Update' : 'Add'} Knowledge
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Bulk Import Knowledge</h2>
                <button onClick={() => setShowBulkImport(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-medium mb-2">Format Instructions:</p>
                <p className="text-sm text-blue-800">
                  Each line should follow this format: <code className="bg-blue-100 px-1 py-0.5 rounded">Title | Category | Content | Tags (optional)</code>
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  Example: React Best Practices | documentation | React hooks should be used at the top level... | react,frontend,hooks
                </p>
              </div>

              <textarea
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                rows={15}
                placeholder="Paste your knowledge entries here, one per line..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 font-mono text-sm"
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleBulkImport}
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                >
                  Import Knowledge
                </button>
                <button
                  onClick={() => { setShowBulkImport(false); setBulkImportText(''); }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Chat History</h2>
          {sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 cursor-pointer transition-colors"
                  onClick={() => loadSession(session.sessionId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{session.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">{session.lastMessage}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{session.messageCount} messages</span>
                        <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <MessageSquare className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No chat history yet</p>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab - Admin Only */}
      {activeTab === 'analytics' && user?.role === 'admin' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">AI Agent Analytics</h2>

            {analytics ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Knowledge</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{analytics.knowledge?.total || 0}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Sessions</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{analytics.chat?.totalSessions || 0}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Messages</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{analytics.chat?.totalMessages || 0}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Messages/Session</p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">{analytics.chat?.averageMessagesPerSession || 0}</p>
                  </div>
                </div>

                {/* Knowledge by Category */}
                <div className="mb-8">
                  <h3 className="font-semibold text-gray-900 mb-4">Knowledge by Category</h3>
                  <div className="space-y-2">
                    {analytics.knowledge?.byCategory?.map((cat) => (
                      <div key={cat._id} className="flex items-center gap-3">
                        <div className="w-32 text-sm font-medium text-gray-700 capitalize">{cat._id}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-primary-600 h-full flex items-center justify-end pr-2 text-xs text-white font-medium"
                            style={{ width: `${(cat.count / analytics.knowledge.total) * 100}%` }}
                          >
                            {cat.count}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Most Active Users */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Most Active Users</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Sessions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.users?.mostActive?.map((user) => (
                          <tr key={user.userId} className="border-b border-gray-100">
                            <td className="py-3 px-4">{user.name}</td>
                            <td className="py-3 px-4">{user.sessions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Loading analytics...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAgent;
