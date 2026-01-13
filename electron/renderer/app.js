const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const errorDiv = document.getElementById('error');
const successDiv = document.getElementById('success');

let statsInterval = null;

const showError = (message) => {
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
  setTimeout(() => {
    errorDiv.classList.add('hidden');
  }, 5000);
};

const showSuccess = (message) => {
  successDiv.textContent = message;
  successDiv.classList.remove('hidden');
  setTimeout(() => {
    successDiv.classList.add('hidden');
  }, 3000);
};

const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleString();
};

const updateStats = async () => {
  try {
    const stats = await window.electronAPI.getStats();

    document.getElementById('monitorStatus').textContent = stats.isRunning
      ? 'Running'
      : 'Stopped';
    document.getElementById('monitorStatus').className = stats.isRunning
      ? 'status-value status-running'
      : 'status-value status-stopped';

    document.getElementById('captureCount').textContent = stats.captureCount;
    document.getElementById('lastCapture').textContent = formatDate(stats.lastCapture);
    document.getElementById('nextCapture').textContent = formatDate(stats.nextCapture);
  } catch (error) {
    console.error('Failed to update stats:', error);
  }
};

const showDashboard = async (user) => {
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');

  document.getElementById('userName').textContent = user.fullName || `${user.firstName} ${user.lastName}`;

  updateStats();
  statsInterval = setInterval(updateStats, 5000);
};

const showLogin = () => {
  dashboardView.classList.add('hidden');
  loginView.classList.remove('hidden');

  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
};

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const loginBtn = document.getElementById('loginBtn');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  const credentials = {
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    apiUrl: document.getElementById('apiUrl').value,
  };

  try {
    const result = await window.electronAPI.login(credentials);

    if (result.success) {
      showDashboard(result.user);
      showSuccess('Login successful! Monitoring started.');
    } else {
      showError(result.error || 'Login failed');
    }
  } catch (error) {
    showError('An unexpected error occurred');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await window.electronAPI.logout();
    showLogin();
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
  } catch (error) {
    showError('Logout failed');
  }
});

window.electronAPI.onMonitoringStarted(() => {
  showSuccess('Screenshot monitoring started');
  updateStats();
});

window.electronAPI.onMonitoringStopped(() => {
  showSuccess('Screenshot monitoring stopped');
  updateStats();
});

window.electronAPI.onScreenshotCaptured((data) => {
  showSuccess(`Screenshot captured (#${data.count})`);
  updateStats();
});

window.electronAPI.onAuthExpired(() => {
  showError('Session expired. Please login again.');
  showLogin();
});

(async () => {
  const { user, token } = await window.electronAPI.getUser();

  if (user && token) {
    showDashboard(user);
  } else {
    showLogin();
  }
})();
