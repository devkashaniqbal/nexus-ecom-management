import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import PermissionProtectedRoute from './components/PermissionProtectedRoute';
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

            <Route path="dashboard" element={
              <PermissionProtectedRoute routeKey="dashboard">
                <Dashboard />
              </PermissionProtectedRoute>
            } />

            <Route path="attendance" element={
              <PermissionProtectedRoute routeKey="attendance">
                <Attendance />
              </PermissionProtectedRoute>
            } />

            <Route path="projects" element={
              <PermissionProtectedRoute routeKey="projects">
                <Projects />
              </PermissionProtectedRoute>
            } />

            <Route path="timesheets" element={
              <PermissionProtectedRoute routeKey="timesheets">
                <Timesheets />
              </PermissionProtectedRoute>
            } />

            <Route path="assets" element={
              <PermissionProtectedRoute routeKey="assets">
                <Assets />
              </PermissionProtectedRoute>
            } />

            <Route path="expenses" element={
              <PermissionProtectedRoute routeKey="expenses">
                <Expenses />
              </PermissionProtectedRoute>
            } />

            <Route path="leaves" element={
              <PermissionProtectedRoute routeKey="leaves">
                <Leaves />
              </PermissionProtectedRoute>
            } />

            <Route path="announcements" element={
              <PermissionProtectedRoute routeKey="announcements">
                <Announcements />
              </PermissionProtectedRoute>
            } />

            <Route path="ai-agent" element={
              <PermissionProtectedRoute routeKey="ai-agent">
                <AIAgent />
              </PermissionProtectedRoute>
            } />

            <Route path="profile" element={<Profile />} />

            <Route path="users" element={
              <PermissionProtectedRoute routeKey="users">
                <Users />
              </PermissionProtectedRoute>
            } />

            <Route path="workspaces" element={
              <PermissionProtectedRoute routeKey="workspaces">
                <Workspaces />
              </PermissionProtectedRoute>
            } />

            <Route path="workspace/:workspaceId" element={
              <PermissionProtectedRoute routeKey="workspaces">
                <WorkspaceDetail />
              </PermissionProtectedRoute>
            } />

            <Route path="workspace/:workspaceId/space/:spaceId" element={
              <PermissionProtectedRoute routeKey="workspaces">
                <SpaceDetail />
              </PermissionProtectedRoute>
            } />

            <Route path="tasks" element={
              <PermissionProtectedRoute routeKey="tasks">
                <Tasks />
              </PermissionProtectedRoute>
            } />

            <Route path="teams" element={
              <PermissionProtectedRoute routeKey="teams">
                <Teams />
              </PermissionProtectedRoute>
            } />

            <Route path="messages" element={
              <PermissionProtectedRoute routeKey="messages">
                <Messages />
              </PermissionProtectedRoute>
            } />

            <Route path="notifications" element={
              <PermissionProtectedRoute routeKey="notifications">
                <Notifications />
              </PermissionProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
