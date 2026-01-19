import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { workspaceAPI } from '../services/api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const WorkspaceContext = createContext(null);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await workspaceAPI.getAll();
      const workspaceList = data.data.workspaces;
      setWorkspaces(workspaceList);

      // Try to restore last workspace from localStorage
      const savedWorkspaceId = localStorage.getItem('currentWorkspace');
      if (savedWorkspaceId) {
        const savedWorkspace = workspaceList.find(w => w._id === savedWorkspaceId);
        if (savedWorkspace) {
          setCurrentWorkspace(savedWorkspace);
        } else if (workspaceList.length > 0) {
          setCurrentWorkspace(workspaceList[0]);
          localStorage.setItem('currentWorkspace', workspaceList[0]._id);
        }
      } else if (workspaceList.length > 0) {
        setCurrentWorkspace(workspaceList[0]);
        localStorage.setItem('currentWorkspace', workspaceList[0]._id);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
      toast.error('Failed to fetch workspaces');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const switchWorkspace = useCallback((workspace) => {
    setCurrentWorkspace(workspace);
    localStorage.setItem('currentWorkspace', workspace._id);
  }, []);

  const createWorkspace = useCallback(async (data) => {
    try {
      const response = await workspaceAPI.create(data);
      const newWorkspace = response.data.data.workspace;
      setWorkspaces(prev => [newWorkspace, ...prev]);
      setCurrentWorkspace(newWorkspace);
      localStorage.setItem('currentWorkspace', newWorkspace._id);
      toast.success('Workspace created successfully');
      return newWorkspace;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create workspace');
      throw error;
    }
  }, []);

  const updateWorkspace = useCallback(async (id, data) => {
    try {
      const response = await workspaceAPI.update(id, data);
      const updatedWorkspace = response.data.data.workspace;
      setWorkspaces(prev => prev.map(w => w._id === id ? updatedWorkspace : w));
      if (currentWorkspace?._id === id) {
        setCurrentWorkspace(updatedWorkspace);
      }
      toast.success('Workspace updated successfully');
      return updatedWorkspace;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update workspace');
      throw error;
    }
  }, [currentWorkspace]);

  const deleteWorkspace = useCallback(async (id) => {
    try {
      await workspaceAPI.delete(id);
      setWorkspaces(prev => prev.filter(w => w._id !== id));
      if (currentWorkspace?._id === id) {
        const remaining = workspaces.filter(w => w._id !== id);
        if (remaining.length > 0) {
          setCurrentWorkspace(remaining[0]);
          localStorage.setItem('currentWorkspace', remaining[0]._id);
        } else {
          setCurrentWorkspace(null);
          localStorage.removeItem('currentWorkspace');
        }
      }
      toast.success('Workspace deleted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete workspace');
      throw error;
    }
  }, [currentWorkspace, workspaces]);

  const inviteMember = useCallback(async (workspaceId, email, role = 'member') => {
    try {
      const response = await workspaceAPI.inviteMember(workspaceId, { email, role });
      toast.success('Invitation sent successfully');
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send invitation');
      throw error;
    }
  }, []);

  const removeMember = useCallback(async (workspaceId, userId) => {
    try {
      await workspaceAPI.removeMember(workspaceId, userId);
      toast.success('Member removed successfully');
      await fetchWorkspaces(); // Refresh workspaces to update member list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove member');
      throw error;
    }
  }, [fetchWorkspaces]);

  const updateMemberRole = useCallback(async (workspaceId, userId, role) => {
    try {
      await workspaceAPI.updateMemberRole(workspaceId, userId, role);
      toast.success('Member role updated successfully');
      await fetchWorkspaces(); // Refresh workspaces to update member list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update member role');
      throw error;
    }
  }, [fetchWorkspaces]);

  const value = {
    workspaces,
    currentWorkspace,
    loading,
    switchWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    inviteMember,
    removeMember,
    updateMemberRole,
    refreshWorkspaces: fetchWorkspaces
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export default WorkspaceContext;
