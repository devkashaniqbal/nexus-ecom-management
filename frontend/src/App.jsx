import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Projects = lazy(() => import('./pages/Projects'));
const Timesheets = lazy(() => import('./pages/Timesheets'));
const Assets = lazy(() => import('./pages/Assets'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Leaves = lazy(() => import('./pages/Leaves'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Profile = lazy(() => import('./pages/Profile'));
const Users = lazy(() => import('./pages/Users'));
const AIAgent = lazy(() => import('./pages/AIAgent'));
const Workspaces = lazy(() => import('./pages/Workspaces'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Teams = lazy(() => import('./pages/Teams'));
const Messages = lazy(() => import('./pages/Messages'));
const Notifications = lazy(() => import('./pages/Notifications'));
const WorkspaceDetail = lazy(() => import('./pages/WorkspaceDetail'));
const SpaceDetail = lazy(() => import('./pages/SpaceDetail'));

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="projects" element={<Projects />} />
            <Route path="timesheets" element={<Timesheets />} />
            <Route path="assets" element={<Assets />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="leaves" element={<Leaves />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="ai-agent" element={<AIAgent />} />
            <Route path="profile" element={<Profile />} />
            <Route path="users" element={<Users />} />
            <Route path="workspaces" element={<Workspaces />} />
            <Route path="workspace/:workspaceId" element={<WorkspaceDetail />} />
            <Route path="workspace/:workspaceId/space/:spaceId" element={<SpaceDetail />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="teams" element={<Teams />} />
            <Route path="messages" element={<Messages />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
