import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Projects from './pages/Projects';
import Timesheets from './pages/Timesheets';
import Assets from './pages/Assets';
import Expenses from './pages/Expenses';
import Leaves from './pages/Leaves';
import Announcements from './pages/Announcements';
import Profile from './pages/Profile';
import Users from './pages/Users';
import AIAgent from './pages/AIAgent';

import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <BrowserRouter>
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
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
