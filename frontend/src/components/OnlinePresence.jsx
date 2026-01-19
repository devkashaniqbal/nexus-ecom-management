import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

const OnlinePresence = ({ userId, showStatus = true, size = 'md' }) => {
  const { onlineUsers } = useSocket();
  const isOnline = onlineUsers.has(userId);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  if (!showStatus) return null;

  return (
    <span
      className={`${sizeClasses[size]} rounded-full ${
        isOnline ? 'bg-green-500' : 'bg-gray-400'
      } border-2 border-white`}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
};

export const UserAvatar = ({ user, size = 'md', showPresence = true }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-12 h-12 text-lg'
  };

  const presencePosition = {
    sm: '-bottom-0.5 -right-0.5',
    md: '-bottom-0.5 -right-0.5',
    lg: '-bottom-1 -right-1',
    xl: '-bottom-1 -right-1'
  };

  const presenceSize = {
    sm: 'sm',
    md: 'sm',
    lg: 'md',
    xl: 'md'
  };

  return (
    <div className="relative inline-block">
      {user?.profileImage ? (
        <img
          src={user.profileImage}
          alt={`${user.firstName} ${user.lastName}`}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium`}
        >
          {user?.firstName?.charAt(0) || '?'}
        </div>
      )}
      {showPresence && user?._id && (
        <span className={`absolute ${presencePosition[size]}`}>
          <OnlinePresence userId={user._id} size={presenceSize[size]} />
        </span>
      )}
    </div>
  );
};

export const TypingIndicator = ({ users = [] }) => {
  if (users.length === 0) return null;

  const getText = () => {
    if (users.length === 1) {
      return `${users[0].firstName} is typing...`;
    } else if (users.length === 2) {
      return `${users[0].firstName} and ${users[1].firstName} are typing...`;
    } else {
      return `${users.length} people are typing...`;
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <div className="flex space-x-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{getText()}</span>
    </div>
  );
};

export const OnlineUsersList = ({ workspaceId }) => {
  const { onlineUsers } = useSocket();
  const [workspaceOnlineUsers, setWorkspaceOnlineUsers] = useState([]);

  useEffect(() => {
    // Filter online users by workspace
    // This would typically come from the socket context with workspace filtering
    const users = Array.from(onlineUsers.values()).filter(Boolean);
    setWorkspaceOnlineUsers(users);
  }, [onlineUsers, workspaceId]);

  if (workspaceOnlineUsers.length === 0) return null;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {workspaceOnlineUsers.slice(0, 5).map((user) => (
          <UserAvatar
            key={user._id || user.id}
            user={user}
            size="sm"
            showPresence={false}
          />
        ))}
      </div>
      {workspaceOnlineUsers.length > 5 && (
        <span className="ml-2 text-xs text-gray-500">
          +{workspaceOnlineUsers.length - 5} more
        </span>
      )}
      <span className="ml-2 text-xs text-gray-500">
        {workspaceOnlineUsers.length} online
      </span>
    </div>
  );
};

export default OnlinePresence;
