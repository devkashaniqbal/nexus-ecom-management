import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldX } from 'lucide-react';

const PermissionProtectedRoute = ({ children, routeKey }) => {
  const { hasRouteAccess, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (routeKey && !hasRouteAccess(routeKey)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default PermissionProtectedRoute;
