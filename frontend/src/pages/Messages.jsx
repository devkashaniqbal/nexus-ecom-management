import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, Hash, Lock, Users, Search, Smile, Paperclip, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { channelAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { format } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner';

const Messages = () => {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const { socket, joinChannel, leaveChannel, startTyping, stopTyping } = useSocket();
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    if (currentWorkspace) {
      fetchChannels();
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel._id);
      joinChannel(selectedChannel._id);

      return () => {
        leaveChannel(selectedChannel._id);
      };
    }
  }, [selectedChannel]);

  useEffect(() => {
    const handleNewMessage = (e) => {
      const message = e.detail;
      if (message.channel === selectedChannel?._id) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
    };

    window.addEventListener('message:new', handleNewMessage);
    return () => window.removeEventListener('message:new', handleNewMessage);
  }, [selectedChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChannels = async () => {
    try {
      const { data } = await channelAPI.getAll({ workspaceId: currentWorkspace?._id });
      setChannels(data.data.channels);
      if (data.data.channels.length > 0) {
        setSelectedChannel(data.data.channels[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch channels');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (channelId) => {
    try {
      const { data } = await channelAPI.getMessages(channelId);
      setMessages(data.data.messages);
    } catch (error) {
      toast.error('Failed to fetch messages');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChannel) return;

    try {
      setSendingMessage(true);
      const { data } = await channelAPI.sendMessage(selectedChannel._id, { content: newMessage });
      setMessages([...messages, data.data.message]);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (selectedChannel) {
      startTyping(`channel:${selectedChannel._id}`);
      setTimeout(() => stopTyping(`channel:${selectedChannel._id}`), 2000);
    }
  };

  if (loading || !currentWorkspace) return <LoadingSpinner />;

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Channel Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="font-bold text-lg">Messages</h2>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search channels..."
              className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2">
            <div className="flex items-center justify-between text-gray-400 text-xs uppercase mb-2">
              <span>Channels</span>
              <button className="hover:text-white">
                <Plus size={16} />
              </button>
            </div>
            {channels.filter(c => c.type !== 'direct').map((channel) => (
              <button
                key={channel._id}
                onClick={() => setSelectedChannel(channel)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  selectedChannel?._id === channel._id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                {channel.type === 'private' ? <Lock size={16} /> : <Hash size={16} />}
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
          </div>

          <div className="px-3 py-2">
            <div className="flex items-center justify-between text-gray-400 text-xs uppercase mb-2">
              <span>Direct Messages</span>
              <button className="hover:text-white">
                <Plus size={16} />
              </button>
            </div>
            {channels.filter(c => c.type === 'direct').map((channel) => (
              <button
                key={channel._id}
                onClick={() => setSelectedChannel(channel)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  selectedChannel?._id === channel._id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs">
                  {channel.members?.[0]?.user?.firstName?.charAt(0) || 'U'}
                </div>
                <span className="truncate">
                  {channel.members?.map(m => m.user?.firstName).join(', ') || 'Direct Message'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <div className="h-16 border-b border-gray-200 px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedChannel.type === 'private' ? <Lock size={20} /> : <Hash size={20} />}
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedChannel.name}</h3>
                  <p className="text-xs text-gray-500">
                    {selectedChannel.members?.length || 0} members
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Users size={20} className="text-gray-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => {
                const showHeader = index === 0 ||
                  messages[index - 1]?.sender?._id !== message.sender?._id ||
                  new Date(message.createdAt) - new Date(messages[index - 1]?.createdAt) > 300000;

                return (
                  <div key={message._id} className={`flex gap-3 ${!showHeader ? 'pl-12' : ''}`}>
                    {showHeader && (
                      <div className="w-9 h-9 rounded-full bg-purple-100 flex-shrink-0 flex items-center justify-center text-purple-600 font-medium">
                        {message.sender?.profileImage ? (
                          <img src={message.sender.profileImage} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          message.sender?.firstName?.charAt(0)
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      {showHeader && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">
                            {message.sender?.firstName} {message.sender?.lastName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(message.createdAt), 'h:mm a')}
                          </span>
                        </div>
                      )}
                      <p className="text-gray-700">{message.content}</p>
                      {message.reactions?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {message.reactions.map((reaction, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-gray-100 rounded-full text-xs"
                            >
                              {reaction.emoji} {reaction.count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <button type="button" className="p-2 hover:bg-gray-100 rounded-lg">
                  <Paperclip size={20} className="text-gray-500" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder={`Message #${selectedChannel.name}`}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button type="button" className="p-2 hover:bg-gray-100 rounded-lg">
                  <Smile size={20} className="text-gray-500" />
                </button>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a channel to start messaging
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
