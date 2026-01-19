import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getDefaultRoutes } from '../config/routePermissions';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/auth/me`);
      setUser(response.data.data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, {
        email,
        password,
      });

      const { token: newToken, user: userData } = response.data.data;

      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      setToken(newToken);
      setUser(userData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  const getAllowedRoutes = useCallback(() => {
    if (!user) return [];
    return user.allowedRoutes || getDefaultRoutes(user.role);
  }, [user]);

  const hasRouteAccess = useCallback((routeKey) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const allowedRoutes = user.allowedRoutes || getDefaultRoutes(user.role);
    return allowedRoutes.includes(routeKey);
  }, [user]);

  const hasPathAccess = useCallback((path) => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    const routeKey = path.replace(/^\//, '').split('/')[0];
    if (!routeKey || routeKey === 'profile') return true;

    const allowedRoutes = user.allowedRoutes || getDefaultRoutes(user.role);
    return allowedRoutes.includes(routeKey);
  }, [user]);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager' || user?.role === 'admin',
    isEmployee: user?.role === 'employee',
    getAllowedRoutes,
    hasRouteAccess,
    hasPathAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
