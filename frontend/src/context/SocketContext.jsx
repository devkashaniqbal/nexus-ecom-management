import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [typingUsers, setTypingUsers] = useState(new Map());

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Remove /api/v1 from URL for socket connection
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/v\d+$/, '');

    const socketInstance = io(baseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    socketInstance.on('notification:new', ({ notification }) => {
      // Dispatch event for notification dropdown
      window.dispatchEvent(new CustomEvent('notification:new', { detail: notification }));

      // Show toast
      toast(notification.title || notification.message, {
        icon: '🔔',
        duration: 5000
      });
    });

    socketInstance.on('task:updated', ({ task }) => {
      window.dispatchEvent(new CustomEvent('task:updated', { detail: task }));
    });

    socketInstance.on('task:created', ({ task }) => {
      window.dispatchEvent(new CustomEvent('task:created', { detail: task }));
    });

    socketInstance.on('task:deleted', ({ taskId }) => {
      window.dispatchEvent(new CustomEvent('task:deleted', { detail: taskId }));
    });

    socketInstance.on('message:new', ({ message }) => {
      window.dispatchEvent(new CustomEvent('message:new', { detail: message }));
    });

    socketInstance.on('user:joined', ({ user, room }) => {
      window.dispatchEvent(new CustomEvent('user:joined', { detail: { user, room } }));
    });

    socketInstance.on('user:left', ({ userId, room }) => {
      window.dispatchEvent(new CustomEvent('user:left', { detail: { userId, room } }));
    });

    socketInstance.on('presence:list', ({ room, users }) => {
      // Update online users map
      const newOnlineUsers = new Map(onlineUsers);
      users.forEach(u => {
        newOnlineUsers.set(u._id || u.id, u);
      });
      setOnlineUsers(newOnlineUsers);
      window.dispatchEvent(new CustomEvent('presence:list', { detail: { room, users } }));
    });

    socketInstance.on('user:online', ({ userId, user: onlineUser }) => {
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, onlineUser);
        return newMap;
      });
    });

    socketInstance.on('user:offline', ({ userId }) => {
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    });

    socketInstance.on('typing:started', ({ userId, user: typingUser, room }) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const roomTyping = newMap.get(room) || [];
        if (!roomTyping.find(u => u._id === userId)) {
          newMap.set(room, [...roomTyping, typingUser || { _id: userId }]);
        }
        return newMap;
      });
      window.dispatchEvent(new CustomEvent('typing:started', { detail: { userId, user: typingUser, room } }));
    });

    socketInstance.on('typing:stopped', ({ userId, room }) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const roomTyping = newMap.get(room) || [];
        newMap.set(room, roomTyping.filter(u => u._id !== userId));
        return newMap;
      });
      window.dispatchEvent(new CustomEvent('typing:stopped', { detail: { userId, room } }));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user]);

  const joinWorkspace = useCallback((workspaceId) => {
    if (socket) {
      socket.emit('join:workspace', workspaceId);
    }
  }, [socket]);

  const leaveWorkspace = useCallback((workspaceId) => {
    if (socket) {
      socket.emit('leave:workspace', workspaceId);
    }
  }, [socket]);

  const joinSpace = useCallback((spaceId) => {
    if (socket) {
      socket.emit('join:space', spaceId);
    }
  }, [socket]);

  const leaveSpace = useCallback((spaceId) => {
    if (socket) {
      socket.emit('leave:space', spaceId);
    }
  }, [socket]);

  const joinList = useCallback((listId) => {
    if (socket) {
      socket.emit('join:list', listId);
    }
  }, [socket]);

  const leaveList = useCallback((listId) => {
    if (socket) {
      socket.emit('leave:list', listId);
    }
  }, [socket]);

  const joinTask = useCallback((taskId) => {
    if (socket) {
      socket.emit('join:task', taskId);
    }
  }, [socket]);

  const leaveTask = useCallback((taskId) => {
    if (socket) {
      socket.emit('leave:task', taskId);
    }
  }, [socket]);

  const joinChannel = useCallback((channelId) => {
    if (socket) {
      socket.emit('join:channel', channelId);
    }
  }, [socket]);

  const leaveChannel = useCallback((channelId) => {
    if (socket) {
      socket.emit('leave:channel', channelId);
    }
  }, [socket]);

  const startTyping = useCallback((room) => {
    if (socket) {
      socket.emit('typing:start', { room });
    }
  }, [socket]);

  const stopTyping = useCallback((room) => {
    if (socket) {
      socket.emit('typing:stop', { room });
    }
  }, [socket]);

  const getTypingUsers = useCallback((room) => {
    return typingUsers.get(room) || [];
  }, [typingUsers]);

  const isUserOnline = useCallback((userId) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  const value = {
    socket,
    isConnected,
    onlineUsers,
    typingUsers,
    getTypingUsers,
    isUserOnline,
    joinWorkspace,
    leaveWorkspace,
    joinSpace,
    leaveSpace,
    joinList,
    leaveList,
    joinTask,
    leaveTask,
    joinChannel,
    leaveChannel,
    startTyping,
    stopTyping
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
