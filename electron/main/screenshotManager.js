import { desktopCapturer, screen } from 'electron';
import sharp from 'sharp';
import activeWindow from 'active-win';
import axios from 'axios';

export class ScreenshotManager {
  constructor(store, mainWindow) {
    this.store = store;
    this.mainWindow = mainWindow;
    this.isRunning = false;
    this.captureCount = 0;
    this.lastCaptureTime = null;
    this.nextCaptureTime = null;
    this.timer = null;
    this.minInterval = parseInt(process.env.SCREENSHOT_MIN_INTERVAL) || 20;
    this.maxInterval = parseInt(process.env.SCREENSHOT_MAX_INTERVAL) || 30;
  }

  getRandomInterval() {
    const minutes = Math.floor(
      Math.random() * (this.maxInterval - this.minInterval + 1) + this.minInterval
    );
    return minutes * 60 * 1000;
  }

  async checkStatus() {
    try {
      const token = this.store.get('token');
      const apiUrl = this.store.get('apiUrl');

      if (!token || !apiUrl) {
        this.stop();
        return { shouldCapture: false, reason: 'Not authenticated' };
      }

      const response = await axios.get(`${apiUrl}/screenshots/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data.data;
    } catch (error) {
      console.error('Status check failed:', error.message);

      if (error.response?.status === 401) {
        this.stop();
        this.store.clear();
        this.mainWindow.webContents.send('auth-expired');
      }

      return { shouldCapture: false, reason: 'Status check failed' };
    }
  }

  async captureScreen() {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: screen.getPrimaryDisplay().workAreaSize,
      });

      if (sources.length === 0) {
        throw new Error('No screen source available');
      }

      return sources[0].thumbnail.toPNG();
    } catch (error) {
      console.error('Screen capture failed:', error);
      throw error;
    }
  }

  async processScreenshot(buffer) {
    try {
      const processed = await sharp(buffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .blur(parseInt(process.env.BLUR_LEVEL) || 5)
        .jpeg({ quality: parseInt(process.env.COMPRESSION_QUALITY) || 70 })
        .toBuffer();

      return processed;
    } catch (error) {
      console.error('Screenshot processing failed:', error);
      throw error;
    }
  }

  async getActiveWindowInfo() {
    try {
      const win = await activeWindow();
      return {
        appTitle: win?.title || 'Unknown',
        screenResolution: `${screen.getPrimaryDisplay().workAreaSize.width}x${screen.getPrimaryDisplay().workAreaSize.height}`,
        deviceInfo: `${process.platform} ${process.arch}`,
      };
    } catch (error) {
      return {
        appTitle: 'Unknown',
        screenResolution: 'Unknown',
        deviceInfo: `${process.platform} ${process.arch}`,
      };
    }
  }

  async uploadScreenshot(processedBuffer, metadata) {
    try {
      const token = this.store.get('token');
      const apiUrl = this.store.get('apiUrl');

      const base64Screenshot = processedBuffer.toString('base64');

      await axios.post(
        `${apiUrl}/screenshots/upload`,
        {
          screenshotData: base64Screenshot,
          metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Screenshot uploaded successfully');
      return true;
    } catch (error) {
      console.error('Screenshot upload failed:', error.message);
      return false;
    }
  }

  async captureAndUpload() {
    try {
      const status = await this.checkStatus();

      if (!status.shouldCapture) {
        console.log(`Screenshot skipped: ${status.reason}`);
        this.scheduleNext();
        return;
      }

      console.log('Capturing screenshot...');

      const rawScreenshot = await this.captureScreen();

      const processedScreenshot = await this.processScreenshot(rawScreenshot);

      const metadata = await this.getActiveWindowInfo();
      metadata.isBlurred = true;
      metadata.isCompressed = true;

      const uploaded = await this.uploadScreenshot(processedScreenshot, metadata);

      if (uploaded) {
        this.captureCount++;
        this.lastCaptureTime = new Date().toISOString();
        this.mainWindow.webContents.send('screenshot-captured', {
          count: this.captureCount,
          time: this.lastCaptureTime,
        });
      }

      this.scheduleNext();
    } catch (error) {
      console.error('Capture and upload failed:', error);
      this.scheduleNext();
    }
  }

  scheduleNext() {
    if (!this.isRunning) return;

    const interval = this.getRandomInterval();
    this.nextCaptureTime = new Date(Date.now() + interval).toISOString();

    console.log(`Next capture scheduled in ${interval / 1000 / 60} minutes`);

    this.timer = setTimeout(() => {
      this.captureAndUpload();
    }, interval);
  }

  start() {
    if (this.isRunning) {
      console.log('Screenshot manager already running');
      return;
    }

    console.log('Starting screenshot manager...');
    this.isRunning = true;
    this.scheduleNext();

    this.mainWindow.webContents.send('monitoring-started');
  }

  stop() {
    if (!this.isRunning) {
      console.log('Screenshot manager not running');
      return;
    }

    console.log('Stopping screenshot manager...');
    this.isRunning = false;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.nextCaptureTime = null;
    this.mainWindow.webContents.send('monitoring-stopped');
  }

  reset() {
    this.stop();
    this.captureCount = 0;
    this.lastCaptureTime = null;
  }
}
