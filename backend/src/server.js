import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import connectDB from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import logger from './utils/logger.js';
import cronJobs from './utils/cronJobs.js';
import socketService from './services/socketService.js';

// Existing routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import screenshotRoutes from './routes/screenshotRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import timesheetRoutes from './routes/timesheetRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import aiAgentRoutes from './routes/aiAgentRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

// New ClickUp-style routes
import workspaceRoutes from './routes/workspaceRoutes.js';
import spaceRoutes from './routes/spaceRoutes.js';
import folderRoutes from './routes/folderRoutes.js';
import listRoutes from './routes/listRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import channelRoutes from './routes/channelRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import salaryRoutes from './routes/salaryRoutes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Initialize Socket.IO
socketService.initialize(httpServer);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(hpp());

// Rate limiting
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    socketConnections: socketService.getConnectedUsersCount()
  });
});

const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

// Existing routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/attendance`, attendanceRoutes);
app.use(`${API_PREFIX}/screenshots`, screenshotRoutes);
app.use(`${API_PREFIX}/projects`, projectRoutes);
app.use(`${API_PREFIX}/timesheets`, timesheetRoutes);
app.use(`${API_PREFIX}/assets`, assetRoutes);
app.use(`${API_PREFIX}/expenses`, expenseRoutes);
app.use(`${API_PREFIX}/leaves`, leaveRoutes);
app.use(`${API_PREFIX}/announcements`, announcementRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/ai-agent`, aiAgentRoutes);
app.use(`${API_PREFIX}/audit`, auditRoutes);

// New ClickUp-style routes
app.use(`${API_PREFIX}/workspaces`, workspaceRoutes);
app.use(`${API_PREFIX}/spaces`, spaceRoutes);
app.use(`${API_PREFIX}/folders`, folderRoutes);
app.use(`${API_PREFIX}/lists`, listRoutes);
app.use(`${API_PREFIX}/tasks`, taskRoutes);
app.use(`${API_PREFIX}/teams`, teamRoutes);
app.use(`${API_PREFIX}/channels`, channelRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/roles`, roleRoutes);
app.use(`${API_PREFIX}/salaries`, salaryRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Error handler
app.use(errorHandler);

// Start cron jobs
cronJobs.start();

// Start server
const server = httpServer.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`Socket.IO enabled for real-time features`);
});

// Graceful shutdown
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
  });
});

export default app;
