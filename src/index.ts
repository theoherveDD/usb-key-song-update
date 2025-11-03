import express from 'express';
import { AppDatabase } from './models/database';
import { DownloadService } from './services/DownloadService';
import { SyncService } from './services/SyncService';
import { DriveMonitorService } from './services/DriveMonitorService';
import { createApiRouter } from './routes/api';
import { logger } from './utils/logger';
import { config } from './utils/config';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Initialize services
const db = new AppDatabase('./data/app.db');
const downloadService = new DownloadService(db);
const syncService = new SyncService(db);
const driveMonitor = new DriveMonitorService();

// Routes
app.use('/api', createApiRouter(db, downloadService, syncService, driveMonitor));

// Serve static HTML pages
app.get('/', (req, res) => {
  res.send(getHomePage());
});

app.get('/settings', (req, res) => {
  res.send(getSettingsPage());
});

app.get('/connect', (req, res) => {
  res.send(getConnectPage());
});

function getHomePage() {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>USB Key Song Update</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .container { max-width: 1200px; margin: 0 auto; }
          header { 
            background: white; 
            padding: 30px; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 30px;
          }
          h1 { color: #333; margin-bottom: 10px; }
          .subtitle { color: #666; font-size: 14px; }
          nav { margin-top: 20px; }
          nav a { 
            color: #667eea; 
            text-decoration: none; 
            margin-right: 20px; 
            font-weight: 600;
          }
          nav a:hover { text-decoration: underline; }
          .card { 
            background: white; 
            padding: 25px; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 20px;
          }
          h2 { color: #333; margin-bottom: 20px; font-size: 22px; }
          .status { 
            padding: 15px 20px; 
            margin: 10px 0; 
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 500;
          }
          .connected { background: #d4edda; color: #155724; }
          .disconnected { background: #f8d7da; color: #721c24; }
          .status-icon { font-size: 20px; }
          .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px;
            margin-top: 20px;
          }
          .stat-box { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center;
          }
          .stat-value { font-size: 32px; font-weight: bold; color: #667eea; }
          .stat-label { color: #666; font-size: 14px; margin-top: 5px; }
          .actions { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px;
          }
          button { 
            padding: 15px 25px; 
            background: #667eea; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 16px; 
            font-weight: 600;
            transition: all 0.3s ease;
          }
          button:hover { 
            background: #5568d3; 
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
          }
          button:disabled { 
            background: #ccc; 
            cursor: not-allowed; 
            transform: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>🎧 USB Key Song Update</h1>
            <p class="subtitle">Automated DJ music library management system</p>
            <nav>
              <a href="/">Dashboard</a>
              <a href="/connect">🔌 Connect</a>
              <a href="/settings">⚙️ Settings</a>
            </nav>
          </header>

          <div class="card">
            <h2>📀 Drive Status</h2>
            <div id="status">Loading...</div>
          </div>

          <div class="card">
            <h2>📊 Statistics</h2>
            <div class="stats" id="stats">Loading...</div>
          </div>

          <div class="card">
            <h2>🎛️ Actions</h2>
            <div class="actions">
              <button onclick="triggerDownload()">⬇️ Download New Tracks</button>
              <button onclick="triggerSync()">🔄 Sync to USB</button>
              <button onclick="scanFiles()">🔍 Scan Downloads</button>
            </div>
          </div>
        </div>

        <script>
          async function fetchStatus() {
            try {
              const res = await fetch('/api/status');
              const data = await res.json();

              document.getElementById('status').innerHTML = \`
                <div class="status \${data.drives.hardDrive ? 'connected' : 'disconnected'}">
                  <span>🔌 Hard Drive</span>
                  <span class="status-icon">\${data.drives.hardDrive ? '✅' : '❌'}</span>
                </div>
                <div class="status \${data.drives.usb ? 'connected' : 'disconnected'}">
                  <span>💾 USB Drive</span>
                  <span class="status-icon">\${data.drives.usb ? '✅' : '❌'}</span>
                </div>
              \`;

              document.getElementById('stats').innerHTML = \`
                <div class="stat-box">
                  <div class="stat-value">\${data.downloads.total || 0}</div>
                  <div class="stat-label">Total Tracks</div>
                </div>
                <div class="stat-box">
                  <div class="stat-value">\${data.downloads.pending || 0}</div>
                  <div class="stat-label">Pending</div>
                </div>
                <div class="stat-box">
                  <div class="stat-value">\${data.downloads.completed || 0}</div>
                  <div class="stat-label">Completed</div>
                </div>
                <div class="stat-box">
                  <div class="stat-value">\${data.downloads.synced || 0}</div>
                  <div class="stat-label">Synced</div>
                </div>
              \`;
            } catch (error) {
              console.error('Error fetching status:', error);
            }
          }

          async function triggerDownload() {
            try {
              const res = await fetch('/api/download', { method: 'POST' });
              const data = await res.json();
              alert(data.message || data.error);
            } catch (error) {
              alert('Error: ' + error.message);
            }
          }

          async function triggerSync() {
            try {
              const res = await fetch('/api/sync', { method: 'POST' });
              const data = await res.json();
              alert(data.message || data.error);
            } catch (error) {
              alert('Error: ' + error.message);
            }
          }

          async function scanFiles() {
            try {
              const res = await fetch('/api/scan', { method: 'POST' });
              const data = await res.json();
              alert(data.message || data.error);
            } catch (error) {
              alert('Error: ' + error.message);
            }
          }

          fetchStatus();
          setInterval(fetchStatus, 5000);
        </script>
      </body>
    </html>
  `;
}

function getSettingsPage() {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Settings - USB Key Song Update</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .container { max-width: 1200px; margin: 0 auto; }
          header { 
            background: white; 
            padding: 30px; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 30px;
          }
          h1 { color: #333; margin-bottom: 10px; }
          .subtitle { color: #666; font-size: 14px; }
          nav { margin-top: 20px; }
          nav a { 
            color: #667eea; 
            text-decoration: none; 
            margin-right: 20px; 
            font-weight: 600;
          }
          nav a:hover { text-decoration: underline; }
          .card { 
            background: white; 
            padding: 25px; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 20px;
          }
          h2 { color: #333; margin-bottom: 20px; font-size: 22px; }
          h3 { color: #555; margin: 20px 0 15px; font-size: 18px; }
          .form-group { margin-bottom: 20px; }
          label { 
            display: block; 
            margin-bottom: 8px; 
            color: #555; 
            font-weight: 600;
            font-size: 14px;
          }
          input, select { 
            width: 100%; 
            padding: 12px; 
            border: 2px solid #e0e0e0; 
            border-radius: 8px; 
            font-size: 14px;
            transition: border-color 0.3s;
          }
          input:focus, select:focus { 
            outline: none; 
            border-color: #667eea; 
          }
          .password-hint { 
            font-size: 12px; 
            color: #999; 
            margin-top: 5px; 
          }
          button { 
            padding: 15px 30px; 
            background: #667eea; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 16px; 
            font-weight: 600;
            transition: all 0.3s ease;
          }
          button:hover { 
            background: #5568d3; 
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
          }
          .save-btn { width: 100%; margin-top: 10px; }
          .success { 
            background: #d4edda; 
            color: #155724; 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 20px;
            display: none;
          }
          .grid-2 { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
          }
          .input-with-button {
            display: flex;
            gap: 10px;
          }
          .input-with-button input {
            flex: 1;
          }
          .browse-btn {
            padding: 12px 20px;
            background: #28a745;
            white-space: nowrap;
            flex-shrink: 0;
          }
          .browse-btn:hover {
            background: #218838;
          }
          /* Modal styles */
          .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 1000;
            align-items: center;
            justify-content: center;
          }
          .modal.active {
            display: flex;
          }
          .modal-content {
            background: white;
            border-radius: 15px;
            width: 90%;
            max-width: 800px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          .modal-header {
            padding: 20px 25px;
            border-bottom: 2px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .modal-header h3 {
            margin: 0;
            color: #333;
          }
          .close-btn {
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #999;
            padding: 0;
            width: 32px;
            height: 32px;
            line-height: 1;
          }
          .close-btn:hover {
            color: #333;
            transform: none;
            box-shadow: none;
          }
          .modal-body {
            padding: 20px 25px;
            overflow-y: auto;
            flex: 1;
          }
          .breadcrumb {
            background: #f8f9fa;
            padding: 12px 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            font-size: 14px;
            color: #666;
            word-break: break-all;
          }
          .quick-access {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 20px;
          }
          .quick-btn {
            padding: 8px 15px;
            background: #e9ecef;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
          }
          .quick-btn:hover {
            background: #667eea;
            color: white;
            transform: none;
            box-shadow: none;
          }
          .folder-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .folder-item {
            padding: 12px 15px;
            background: #f8f9fa;
            border: 2px solid transparent;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.2s;
          }
          .folder-item:hover {
            background: #e9ecef;
            border-color: #667eea;
          }
          .folder-icon {
            font-size: 20px;
          }
          .folder-name {
            flex: 1;
            font-weight: 500;
          }
          .modal-footer {
            padding: 20px 25px;
            border-top: 2px solid #e0e0e0;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
          }
          .cancel-btn {
            background: #6c757d;
          }
          .cancel-btn:hover {
            background: #5a6268;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>⚙️ Settings</h1>
            <p class="subtitle">Configure your paths, credentials, and preferences</p>
            <nav>
              <a href="/">Dashboard</a>
              <a href="/connect">🔌 Connect</a>
              <a href="/settings">⚙️ Settings</a>
            </nav>
          </header>

          <div class="success" id="successMessage">Configuration saved successfully!</div>

          <form id="configForm">
            <div class="card">
              <h2>📁 Paths Configuration</h2>
              <div class="form-group">
                <label for="hardDrive">🔌 Hard Drive Path</label>
                <div class="input-with-button">
                  <input type="text" id="hardDrive" name="hardDrive" placeholder="/Volumes/MusicDrive">
                  <button type="button" class="browse-btn" onclick="openFileBrowser('hardDrive')">📂 Browse</button>
                </div>
              </div>
              <div class="form-group">
                <label for="usbDrive">💾 USB Drive Path</label>
                <div class="input-with-button">
                  <input type="text" id="usbDrive" name="usbDrive" placeholder="/Volumes/DJ_USB">
                  <button type="button" class="browse-btn" onclick="openFileBrowser('usbDrive')">📂 Browse</button>
                </div>
              </div>
              <div class="form-group">
                <label for="downloadBase">📂 Download Base Path</label>
                <div class="input-with-button">
                  <input type="text" id="downloadBase" name="downloadBase" placeholder="/Volumes/MusicDrive/DJ_Music">
                  <button type="button" class="browse-btn" onclick="openFileBrowser('downloadBase')">📂 Browse</button>
                </div>
              </div>
              <div class="form-group">
                <label for="rekordboxDb">🎚️ Rekordbox DB Path</label>
                <div class="input-with-button">
                  <input type="text" id="rekordboxDb" name="rekordboxDb" placeholder="/Applications/Pioneer/rekordbox">
                  <button type="button" class="browse-btn" onclick="openFileBrowser('rekordboxDb')">📂 Browse</button>
                </div>
              </div>
            </div>

            <div class="card">
              <h2>🔧 Tools Configuration</h2>
              <div class="grid-2">
                <div class="form-group">
                  <label for="scdlPath">SoundCloud Downloader (scdl)</label>
                  <div class="input-with-button">
                    <input type="text" id="scdlPath" name="scdlPath" placeholder="/usr/local/bin/scdl">
                    <button type="button" class="browse-btn" onclick="openFileBrowser('scdlPath')">📂 Browse</button>
                  </div>
                </div>
                <div class="form-group">
                  <label for="beatportDlPath">Beatport Downloader</label>
                  <div class="input-with-button">
                    <input type="text" id="beatportDlPath" name="beatportDlPath" placeholder="/usr/local/bin/beatport-dl">
                    <button type="button" class="browse-btn" onclick="openFileBrowser('beatportDlPath')">📂 Browse</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <h2>🎵 Streaming Services API</h2>
              
              <h3>🎧 Spotify</h3>
              <div class="grid-2">
                <div class="form-group">
                  <label for="spotifyClientId">Client ID</label>
                  <input type="text" id="spotifyClientId" name="spotifyClientId">
                </div>
                <div class="form-group">
                  <label for="spotifyClientSecret">Client Secret</label>
                  <input type="password" id="spotifyClientSecret" name="spotifyClientSecret">
                  <div class="password-hint">Leave empty to keep current value</div>
                </div>
              </div>
              <div class="form-group">
                <label for="spotifyRefreshToken">Refresh Token (required for liked tracks)</label>
                <input type="password" id="spotifyRefreshToken" name="spotifyRefreshToken">
                <div class="password-hint">See SPOTIFY-OAUTH-SETUP.md for instructions</div>
              </div>

              <h3>🌊 Tidal</h3>
              <div class="grid-2">
                <div class="form-group">
                  <label for="tidalClientId">Client ID</label>
                  <input type="text" id="tidalClientId" name="tidalClientId">
                </div>
                <div class="form-group">
                  <label for="tidalClientSecret">Client Secret</label>
                  <input type="password" id="tidalClientSecret" name="tidalClientSecret">
                  <div class="password-hint">Leave empty to keep current value</div>
                </div>
              </div>

              <h3>☁️ SoundCloud</h3>
              <div class="form-group">
                <label for="soundcloudToken">Auth Token</label>
                <input type="password" id="soundcloudToken" name="soundcloudToken">
                <div class="password-hint">Leave empty to keep current value</div>
              </div>

              <h3>🎼 Beatport</h3>
              <div class="grid-2">
                <div class="form-group">
                  <label for="beatportUsername">Username</label>
                  <input type="text" id="beatportUsername" name="beatportUsername">
                </div>
                <div class="form-group">
                  <label for="beatportPassword">Password</label>
                  <input type="password" id="beatportPassword" name="beatportPassword">
                  <div class="password-hint">Leave empty to keep current value</div>
                </div>
              </div>
            </div>

            <div class="card">
              <h2>⚙️ Monitoring Options</h2>
              <div class="grid-2">
                <div class="form-group">
                  <label for="checkInterval">Check Interval (minutes)</label>
                  <input type="number" id="checkInterval" name="checkInterval" min="5" max="1440">
                </div>
                <div class="form-group">
                  <label for="autoSync">Auto Sync</label>
                  <select id="autoSync" name="autoSync">
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="card">
              <button type="submit" class="save-btn">💾 Save Configuration</button>
            </div>
          </form>
        </div>

        <!-- File Browser Modal -->
        <div id="fileBrowserModal" class="modal">
          <div class="modal-content">
            <div class="modal-header">
              <h3>📂 Select Folder</h3>
              <button class="close-btn" onclick="closeFileBrowser()">&times;</button>
            </div>
            <div class="modal-body">
              <div class="breadcrumb" id="currentPath">/</div>
              <div class="quick-access" id="quickAccess"></div>
              <div class="folder-list" id="folderList"></div>
            </div>
            <div class="modal-footer">
              <button class="cancel-btn" onclick="closeFileBrowser()">Cancel</button>
              <button onclick="selectCurrentPath()">Select This Folder</button>
            </div>
          </div>
        </div>

        <script>
          let currentTargetInput = null;
          let currentBrowsePath = null;

          async function loadConfig() {
            try {
              const res = await fetch('/api/config');
              const data = await res.json();
              const cfg = data.config;

              document.getElementById('hardDrive').value = cfg.paths?.hardDrive || '';
              document.getElementById('usbDrive').value = cfg.paths?.usbDrive || '';
              document.getElementById('downloadBase').value = cfg.paths?.downloadBase || '';
              document.getElementById('rekordboxDb').value = cfg.paths?.rekordboxDb || '';

              document.getElementById('scdlPath').value = cfg.tools?.scdlPath || '';
              document.getElementById('beatportDlPath').value = cfg.tools?.beatportDlPath || '';

              document.getElementById('spotifyClientId').value = cfg.spotify?.clientId || '';
              // Don't display password values for security
              document.getElementById('tidalClientId').value = cfg.tidal?.clientId || '';
              document.getElementById('beatportUsername').value = cfg.beatport?.username || '';

              document.getElementById('checkInterval').value = cfg.monitoring?.checkInterval || 30;
              document.getElementById('autoSync').value = cfg.monitoring?.autoSyncEnabled ? 'true' : 'false';
            } catch (error) {
              console.error('Error loading config:', error);
              alert('Error loading configuration');
            }
          }

          document.getElementById('configForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(e.target);
            const config = {
              paths: {
                hardDrive: formData.get('hardDrive'),
                usbDrive: formData.get('usbDrive'),
                downloadBase: formData.get('downloadBase'),
                rekordboxDb: formData.get('rekordboxDb')
              },
              tools: {
                scdlPath: formData.get('scdlPath'),
                beatportDlPath: formData.get('beatportDlPath')
              },
              spotify: {
                clientId: formData.get('spotifyClientId')
              },
              tidal: {
                clientId: formData.get('tidalClientId')
              },
              soundcloud: {},
              beatport: {
                username: formData.get('beatportUsername')
              },
              monitoring: {
                checkInterval: parseInt(formData.get('checkInterval')),
                autoSyncEnabled: formData.get('autoSync') === 'true'
              }
            };

            // Only include secrets if they're not empty
            if (formData.get('spotifyClientSecret')) {
              config.spotify.clientSecret = formData.get('spotifyClientSecret');
            }
            if (formData.get('spotifyRefreshToken')) {
              config.spotify.refreshToken = formData.get('spotifyRefreshToken');
            }
            if (formData.get('tidalClientSecret')) {
              config.tidal.clientSecret = formData.get('tidalClientSecret');
            }
            if (formData.get('soundcloudToken')) {
              config.soundcloud.authToken = formData.get('soundcloudToken');
            }
            if (formData.get('beatportPassword')) {
              config.beatport.password = formData.get('beatportPassword');
            }

            try {
              const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
              });

              const data = await res.json();

              if (res.ok) {
                const successMsg = document.getElementById('successMessage');
                successMsg.style.display = 'block';
                setTimeout(() => successMsg.style.display = 'none', 3000);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                alert('Error: ' + data.error);
              }
            } catch (error) {
              alert('Error saving configuration: ' + error.message);
            }
          });

          // File Browser Functions
          async function openFileBrowser(inputId) {
            currentTargetInput = inputId;
            const inputValue = document.getElementById(inputId).value;
            currentBrowsePath = inputValue || null;
            
            document.getElementById('fileBrowserModal').classList.add('active');
            await loadQuickAccess();
            if (currentBrowsePath) {
              await browsePath(currentBrowsePath);
            } else {
              await loadQuickAccess();
            }
          }

          function closeFileBrowser() {
            document.getElementById('fileBrowserModal').classList.remove('active');
            currentTargetInput = null;
            currentBrowsePath = null;
          }

          function selectCurrentPath() {
            if (currentTargetInput && currentBrowsePath) {
              document.getElementById(currentTargetInput).value = currentBrowsePath;
              closeFileBrowser();
            }
          }

          async function loadQuickAccess() {
            try {
              const res = await fetch('/api/filesystem/volumes');
              const data = await res.json();
              
              const quickAccess = document.getElementById('quickAccess');
              quickAccess.innerHTML = data.volumes.map(vol => 
                \`<button type="button" class="quick-btn" onclick="browsePath('\${vol.path}')">\${vol.name}</button>\`
              ).join('');

              if (!currentBrowsePath && data.volumes.length > 0) {
                await browsePath(data.volumes[0].path);
              }
            } catch (error) {
              console.error('Error loading volumes:', error);
            }
          }

          async function browsePath(dirPath) {
            try {
              const res = await fetch(\`/api/filesystem/browse?path=\${encodeURIComponent(dirPath)}\`);
              if (!res.ok) {
                alert('Cannot access this path');
                return;
              }

              const data = await res.json();
              currentBrowsePath = data.currentPath;

              document.getElementById('currentPath').textContent = data.currentPath;

              const folderList = document.getElementById('folderList');
              let html = '';

              // Add parent directory option
              if (data.parentPath) {
                html += \`
                  <div class="folder-item" onclick="browsePath('\${data.parentPath}')">
                    <span class="folder-icon">⬆️</span>
                    <span class="folder-name">.. (Parent Directory)</span>
                  </div>
                \`;
              }

              // Add folders
              html += data.items.map(item => \`
                <div class="folder-item" onclick="browsePath('\${item.path}')">
                  <span class="folder-icon">📁</span>
                  <span class="folder-name">\${item.name}</span>
                </div>
              \`).join('');

              if (data.items.length === 0 && !data.parentPath) {
                html = '<p style="text-align: center; color: #999;">No folders found</p>';
              }

              folderList.innerHTML = html;
            } catch (error) {
              console.error('Error browsing path:', error);
              alert('Error loading folder contents');
            }
          }

          loadConfig();
        </script>
      </body>
    </html>
  `;
}

function getConnectPage() {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Connect Services - USB Key Song Update</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .container { max-width: 900px; margin: 0 auto; }
          header { 
            background: white; 
            padding: 30px; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 30px;
          }
          h1 { color: #333; margin-bottom: 10px; }
          .subtitle { color: #666; font-size: 14px; }
          nav { margin-top: 20px; }
          nav a { 
            color: #667eea; 
            text-decoration: none; 
            margin-right: 20px; 
            font-weight: 600;
          }
          nav a:hover { text-decoration: underline; }
          .card { 
            background: white; 
            padding: 30px; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 20px;
          }
          .service-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 25px;
            margin: 15px 0;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            transition: all 0.3s ease;
          }
          .service-card:hover {
            border-color: #667eea;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
          }
          .service-info {
            display: flex;
            align-items: center;
            gap: 20px;
          }
          .service-icon {
            font-size: 48px;
            width: 60px;
            text-align: center;
          }
          .service-details h3 {
            color: #333;
            margin-bottom: 5px;
            font-size: 20px;
          }
          .service-details p {
            color: #666;
            font-size: 14px;
          }
          .status-badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-right: 15px;
          }
          .status-connected {
            background: #d4edda;
            color: #155724;
          }
          .status-disconnected {
            background: #f8d7da;
            color: #721c24;
          }
          .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
          }
          .btn-primary {
            background: #1DB954;
            color: white;
          }
          .btn-primary:hover {
            background: #1ed760;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(29, 185, 84, 0.4);
          }
          .btn-danger {
            background: #dc3545;
            color: white;
          }
          .btn-danger:hover {
            background: #c82333;
          }
          .btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
          }
          .alert {
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }
          .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
          }
          .alert-info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
          }
          .loading {
            text-align: center;
            padding: 20px;
            color: #666;
          }
          h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 24px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>🔌 Connect Services</h1>
            <p class="subtitle">Link your music streaming accounts with one click</p>
            <nav>
              <a href="/">Dashboard</a>
              <a href="/connect">🔌 Connect</a>
              <a href="/settings">⚙️ Settings</a>
            </nav>
          </header>

          <div id="alerts"></div>

          <div class="card">
            <h2>Streaming Services</h2>
            <p style="color: #666; margin-bottom: 25px;">
              Connect your favorite streaming services to automatically sync your liked tracks
            </p>

            <div id="services-list">
              <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Loading services...
              </div>
            </div>
          </div>

          <div class="card">
            <h2>ℹ️ How it works</h2>
            <ol style="line-height: 2; color: #666;">
              <li><strong>Click "Connect"</strong> on any service above</li>
              <li><strong>Authorize the app</strong> in the popup window</li>
              <li><strong>Done!</strong> Your liked tracks will be automatically synced</li>
            </ol>
            <p style="margin-top: 15px; color: #888; font-size: 14px;">
              🔒 Your credentials are stored securely and never shared with third parties.
            </p>
          </div>
        </div>

        <script>
          // Check URL parameters for OAuth callbacks
          const urlParams = new URLSearchParams(window.location.search);
          const spotifyConnected = urlParams.get('spotify_connected');
          const error = urlParams.get('error');

          // Display alerts
          const alertsDiv = document.getElementById('alerts');
          if (spotifyConnected === 'true') {
            alertsDiv.innerHTML = \`
              <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> <strong>Success!</strong> Spotify connected successfully!
              </div>
            \`;
            // Clean URL
            window.history.replaceState({}, document.title, '/connect');
          }
          if (error) {
            alertsDiv.innerHTML = \`
              <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i> <strong>Error:</strong> \${decodeURIComponent(error)}
              </div>
            \`;
            // Clean URL
            window.history.replaceState({}, document.title, '/connect');
          }

          async function loadServicesStatus() {
            try {
              // Check Spotify status
              const spotifyRes = await fetch('/api/spotify/status');
              const spotifyData = await spotifyRes.json();

              const servicesHtml = \`
                <!-- Spotify -->
                <div class="service-card">
                  <div class="service-info">
                    <div class="service-icon" style="color: #1DB954;">
                      <i class="fab fa-spotify"></i>
                    </div>
                    <div class="service-details">
                      <h3>Spotify</h3>
                      <p>Sync your liked tracks and playlists</p>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center;">
                    <span class="status-badge \${spotifyData.connected ? 'status-connected' : 'status-disconnected'}">
                      \${spotifyData.connected ? '✓ Connected' : '✗ Not Connected'}
                    </span>
                    \${spotifyData.connected 
                      ? '<button class="btn btn-danger" onclick="disconnectSpotify()">Disconnect</button>'
                      : '<button class="btn btn-primary" onclick="connectSpotify()"><i class="fab fa-spotify"></i> Connect Spotify</button>'
                    }
                  </div>
                </div>

                <!-- Tidal (Coming Soon) -->
                <div class="service-card" style="opacity: 0.6;">
                  <div class="service-info">
                    <div class="service-icon" style="color: #000000;">
                      <i class="fas fa-music"></i>
                    </div>
                    <div class="service-details">
                      <h3>Tidal</h3>
                      <p>Sync your favorite tracks (Coming Soon)</p>
                    </div>
                  </div>
                  <div>
                    <button class="btn" disabled>Coming Soon</button>
                  </div>
                </div>

                <!-- SoundCloud -->
                <div class="service-card" style="opacity: 0.6;">
                  <div class="service-info">
                    <div class="service-icon" style="color: #ff5500;">
                      <i class="fab fa-soundcloud"></i>
                    </div>
                    <div class="service-details">
                      <h3>SoundCloud</h3>
                      <p>Configure via Settings page</p>
                    </div>
                  </div>
                  <div>
                    <a href="/settings" class="btn" style="background: #ff5500; color: white;">
                      Go to Settings
                    </a>
                  </div>
                </div>
              \`;

              document.getElementById('services-list').innerHTML = servicesHtml;

            } catch (error) {
              console.error('Error loading services:', error);
              document.getElementById('services-list').innerHTML = \`
                <div class="alert alert-error">
                  Failed to load services status. Please refresh the page.
                </div>
              \`;
            }
          }

          async function connectSpotify() {
            try {
              const res = await fetch('/api/spotify/auth');
              const data = await res.json();
              
              if (data.authUrl) {
                // Redirect to Spotify authorization
                window.location.href = data.authUrl;
              } else {
                alert('Error: Could not generate authorization URL');
              }
            } catch (error) {
              alert('Error connecting to Spotify: ' + error.message);
            }
          }

          async function disconnectSpotify() {
            if (!confirm('Are you sure you want to disconnect Spotify?')) {
              return;
            }

            try {
              const res = await fetch('/api/spotify/disconnect', { method: 'POST' });
              const data = await res.json();
              
              if (res.ok) {
                alertsDiv.innerHTML = \`
                  <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> Spotify disconnected successfully.
                  </div>
                \`;
                loadServicesStatus();
              } else {
                alert('Error: ' + data.error);
              }
            } catch (error) {
              alert('Error disconnecting Spotify: ' + error.message);
            }
          }

          // Load services on page load
          loadServicesStatus();
          
          // Auto-refresh every 10 seconds
          setInterval(loadServicesStatus, 10000);
        </script>
      </body>
    </html>
  `;
}

// Start server
app.listen(port, () => {
  logger.info(`Web interface running at http://localhost:${port}`);
  logger.info('API available at /api');
  
  // Start drive monitoring
  driveMonitor.start();
  logger.info('Drive monitor service started');
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down web server');
  driveMonitor.stop();
  db.close();
  process.exit(0);
});
