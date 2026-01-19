import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../utils/logger.js';

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
    this.userSockets = new Map();
    this.roomPresence = new Map();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        if (!token) return next(new Error('Authentication required'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user || !user.isActive) return next(new Error('User not found or inactive'));

        socket.user = user;
        socket.userId = user._id.toString();
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket) => this.handleConnection(socket));

    logger.info('Socket.IO initialized');
    return this.io;
  }

  handleConnection(socket) {
    const userId = socket.userId;
    logger.info(`User connected: ${userId}`);

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);
    this.connectedUsers.set(socket.id, { userId, user: socket.user, connectedAt: new Date() });

    socket.on('join:workspace', (workspaceId) => this.joinWorkspace(socket, workspaceId));
    socket.on('leave:workspace', (workspaceId) => this.leaveWorkspace(socket, workspaceId));
    socket.on('join:space', (spaceId) => this.joinRoom(socket, `space:${spaceId}`));
    socket.on('leave:space', (spaceId) => this.leaveRoom(socket, `space:${spaceId}`));
    socket.on('join:list', (listId) => this.joinRoom(socket, `list:${listId}`));
    socket.on('leave:list', (listId) => this.leaveRoom(socket, `list:${listId}`));
    socket.on('join:task', (taskId) => this.joinRoom(socket, `task:${taskId}`));
    socket.on('leave:task', (taskId) => this.leaveRoom(socket, `task:${taskId}`));
    socket.on('join:channel', (channelId) => this.joinRoom(socket, `channel:${channelId}`));
    socket.on('leave:channel', (channelId) => this.leaveRoom(socket, `channel:${channelId}`));

    socket.on('presence:update', (data) => this.updatePresence(socket, data));
    socket.on('typing:start', (data) => this.handleTyping(socket, data, true));
    socket.on('typing:stop', (data) => this.handleTyping(socket, data, false));

    socket.on('cursor:move', (data) => this.handleCursorMove(socket, data));
    socket.on('selection:change', (data) => this.handleSelectionChange(socket, data));

    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  joinWorkspace(socket, workspaceId) {
    const room = `workspace:${workspaceId}`;
    socket.join(room);
    this.addToPresence(room, socket.userId, socket.user);
    socket.to(room).emit('user:joined', { user: socket.user, room });
    socket.emit('presence:list', { room, users: this.getRoomPresence(room) });
  }

  leaveWorkspace(socket, workspaceId) {
    const room = `workspace:${workspaceId}`;
    socket.leave(room);
    this.removeFromPresence(room, socket.userId);
    socket.to(room).emit('user:left', { userId: socket.userId, room });
  }

  joinRoom(socket, room) {
    socket.join(room);
    this.addToPresence(room, socket.userId, socket.user);
    socket.to(room).emit('user:joined', { user: socket.user, room });
    socket.emit('presence:list', { room, users: this.getRoomPresence(room) });
  }

  leaveRoom(socket, room) {
    socket.leave(room);
    this.removeFromPresence(room, socket.userId);
    socket.to(room).emit('user:left', { userId: socket.userId, room });
  }

  addToPresence(room, userId, user) {
    if (!this.roomPresence.has(room)) {
      this.roomPresence.set(room, new Map());
    }
    this.roomPresence.get(room).set(userId, {
      id: userId,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: user.profileImage,
      status: 'online',
      lastSeen: new Date()
    });
  }

  removeFromPresence(room, userId) {
    if (this.roomPresence.has(room)) {
      this.roomPresence.get(room).delete(userId);
      if (this.roomPresence.get(room).size === 0) {
        this.roomPresence.delete(room);
      }
    }
  }

  getRoomPresence(room) {
    if (!this.roomPresence.has(room)) return [];
    return Array.from(this.roomPresence.get(room).values());
  }

  updatePresence(socket, data) {
    const { room, status } = data;
    if (this.roomPresence.has(room) && this.roomPresence.get(room).has(socket.userId)) {
      const presence = this.roomPresence.get(room).get(socket.userId);
      presence.status = status;
      presence.lastSeen = new Date();
      socket.to(room).emit('presence:updated', { userId: socket.userId, status, room });
    }
  }

  handleTyping(socket, data, isTyping) {
    const { room } = data;
    socket.to(room).emit(isTyping ? 'typing:started' : 'typing:stopped', {
      userId: socket.userId,
      user: { firstName: socket.user.firstName, lastName: socket.user.lastName },
      room
    });
  }

  handleCursorMove(socket, data) {
    const { room, position } = data;
    socket.to(room).emit('cursor:moved', {
      userId: socket.userId,
      user: { firstName: socket.user.firstName, lastName: socket.user.lastName, profileImage: socket.user.profileImage },
      position
    });
  }

  handleSelectionChange(socket, data) {
    const { room, selection } = data;
    socket.to(room).emit('selection:changed', {
      userId: socket.userId,
      user: { firstName: socket.user.firstName, lastName: socket.user.lastName },
      selection
    });
  }

  handleDisconnect(socket) {
    const userId = socket.userId;
    logger.info(`User disconnected: ${userId}`);

    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socket.id);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
        for (const [room, presence] of this.roomPresence) {
          if (presence.has(userId)) {
            presence.delete(userId);
            this.io.to(room).emit('user:left', { userId, room });
          }
        }
      }
    }
    this.connectedUsers.delete(socket.id);
  }

  emitToUser(userId, event, data) {
    if (!this.io) return;
    const sockets = this.userSockets.get(userId.toString());
    if (sockets) {
      sockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  emitToUsers(userIds, event, data) {
    if (!this.io) return;
    userIds.forEach(userId => this.emitToUser(userId, event, data));
  }

  emitToRoom(room, event, data) {
    if (!this.io) return;
    this.io.to(room).emit(event, data);
  }

  emitToWorkspace(workspaceId, event, data) {
    if (!this.io) return;
    this.io.to(`workspace:${workspaceId}`).emit(event, data);
  }

  emitToSpace(spaceId, event, data) {
    if (!this.io) return;
    this.io.to(`space:${spaceId}`).emit(event, data);
  }

  emitToList(listId, event, data) {
    if (!this.io) return;
    this.io.to(`list:${listId}`).emit(event, data);
  }

  emitToTask(taskId, event, data) {
    if (!this.io) return;
    this.io.to(`task:${taskId}`).emit(event, data);
  }

  emitToChannel(channelId, event, data) {
    if (!this.io) return;
    this.io.to(`channel:${channelId}`).emit(event, data);
  }

  isUserOnline(userId) {
    return this.userSockets.has(userId.toString());
  }

  getOnlineUsers() {
    return Array.from(this.userSockets.keys());
  }

  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }
}

const socketService = new SocketService();
export default socketService;
