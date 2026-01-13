import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  logout: () => ipcRenderer.invoke('logout'),
  getUser: () => ipcRenderer.invoke('get-user'),
  getStats: () => ipcRenderer.invoke('get-stats'),
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),

  onMonitoringStarted: (callback) => {
    ipcRenderer.on('monitoring-started', callback);
  },
  onMonitoringStopped: (callback) => {
    ipcRenderer.on('monitoring-stopped', callback);
  },
  onScreenshotCaptured: (callback) => {
    ipcRenderer.on('screenshot-captured', (event, data) => callback(data));
  },
  onAuthExpired: (callback) => {
    ipcRenderer.on('auth-expired', callback);
  },
});
