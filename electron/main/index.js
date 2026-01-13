import { app, BrowserWindow, Tray, Menu, ipcMain, screen, desktopCapturer } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import { ScreenshotManager } from './screenshotManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store();
let mainWindow = null;
let tray = null;
let screenshotManager = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    frame: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
};

const createTray = () => {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Dashboard',
      click: () => {
        mainWindow.show();
      },
    },
    {
      label: 'Screenshot Status',
      submenu: [
        {
          label: screenshotManager?.isRunning ? 'Running' : 'Stopped',
          enabled: false,
        },
        {
          label: `Captured: ${screenshotManager?.captureCount || 0}`,
          enabled: false,
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Start Monitoring',
      click: () => {
        if (store.get('token')) {
          screenshotManager?.start();
        } else {
          mainWindow.show();
        }
      },
      enabled: !screenshotManager?.isRunning,
    },
    {
      label: 'Stop Monitoring',
      click: () => {
        screenshotManager?.stop();
      },
      enabled: screenshotManager?.isRunning,
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Company Management - Screenshot Monitor');

  tray.on('click', () => {
    mainWindow.show();
  });
};

ipcMain.handle('login', async (event, { email, password, apiUrl }) => {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.post(`${apiUrl}/auth/login`, {
      email,
      password,
    });

    const { token, user } = response.data.data;

    store.set('token', token);
    store.set('user', user);
    store.set('apiUrl', apiUrl);

    if (!screenshotManager) {
      screenshotManager = new ScreenshotManager(store, mainWindow);
    }

    screenshotManager.start();

    return { success: true, user };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Login failed',
    };
  }
});

ipcMain.handle('logout', async () => {
  screenshotManager?.stop();
  store.clear();
  return { success: true };
});

ipcMain.handle('get-user', async () => {
  const user = store.get('user');
  const token = store.get('token');
  return { user, token };
});

ipcMain.handle('get-stats', async () => {
  return {
    isRunning: screenshotManager?.isRunning || false,
    captureCount: screenshotManager?.captureCount || 0,
    lastCapture: screenshotManager?.lastCaptureTime || null,
    nextCapture: screenshotManager?.nextCaptureTime || null,
  };
});

ipcMain.handle('capture-screenshot', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: screen.getPrimaryDisplay().workAreaSize,
    });

    if (sources.length > 0) {
      const screenshot = sources[0].thumbnail.toDataURL();
      return { success: true, screenshot };
    }

    return { success: false, error: 'No screen source available' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  const token = store.get('token');
  if (token) {
    screenshotManager = new ScreenshotManager(store, mainWindow);
    screenshotManager.start();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  screenshotManager?.stop();
});
