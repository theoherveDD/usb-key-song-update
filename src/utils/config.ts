import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { AppConfig } from '../types';

// Charge .env.local en priorité (développement), sinon .env (production)
const envFile = fs.existsSync(path.join(process.cwd(), '.env.local')) 
  ? '.env.local' 
  : '.env';
console.log(`Loading environment from: ${envFile}`);
dotenv.config({ path: envFile });
console.log(`SPOTIFY_REDIRECT_URI: ${process.env.SPOTIFY_REDIRECT_URI}`);

const CONFIG_FILE = path.join(process.cwd(), 'data', 'config.json');

// Default configuration
const defaultConfig: AppConfig = {
  paths: {
    hardDrive: process.env.HARD_DRIVE_PATH || '/Volumes/MusicDrive',
    usbDrive: process.env.USB_DRIVE_PATH || '/Volumes/DJ_USB',
    downloadBase: process.env.DOWNLOAD_BASE_PATH || '/Volumes/MusicDrive/DJ_Music',
    rekordboxDb: process.env.REKORDBOX_DB_PATH || '/Applications/Pioneer/rekordbox'
  },
  tools: {
    scdlPath: process.env.SCDL_PATH || '/usr/local/bin/scdl',
    beatportDlPath: process.env.BEATPORT_DL_PATH || '/usr/local/bin/beatport-dl'
  },
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/callback/spotify',
    refreshToken: process.env.SPOTIFY_REFRESH_TOKEN || ''
  },
  tidal: {
    clientId: process.env.TIDAL_CLIENT_ID || '',
    clientSecret: process.env.TIDAL_CLIENT_SECRET || ''
  },
  soundcloud: {
    authToken: process.env.SOUNDCLOUD_AUTH_TOKEN || ''
  },
  beatport: {
    username: process.env.BEATPORT_USERNAME || '',
    password: process.env.BEATPORT_PASSWORD || ''
  },
  monitoring: {
    checkInterval: parseInt(process.env.CHECK_INTERVAL_MINUTES || '30', 10),
    autoSyncEnabled: process.env.AUTO_SYNC_ENABLED === 'true'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log'
  }
};

// Load saved configuration if exists
function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      const merged = { ...defaultConfig, ...savedConfig };
      
      // IMPORTANT: Always prioritize environment variables over saved config
      if (process.env.SPOTIFY_REDIRECT_URI) {
        merged.spotify.redirectUri = process.env.SPOTIFY_REDIRECT_URI;
      }
      if (process.env.SPOTIFY_CLIENT_ID) {
        merged.spotify.clientId = process.env.SPOTIFY_CLIENT_ID;
      }
      if (process.env.SPOTIFY_CLIENT_SECRET) {
        merged.spotify.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
      }
      if (process.env.BEATPORT_USERNAME) {
        merged.beatport.username = process.env.BEATPORT_USERNAME;
      }
      if (process.env.BEATPORT_PASSWORD) {
        merged.beatport.password = process.env.BEATPORT_PASSWORD;
      }
      
      return merged;
    }
  } catch (error) {
    console.error('Error loading config file:', error);
  }
  return defaultConfig;
}

// Save configuration to file
export function saveConfig(newConfig: Partial<AppConfig>): void {
  try {
    const currentConfig = loadConfig();
    
    // Merge new config but preserve Beatport credentials from environment
    const updatedConfig = { 
      ...currentConfig, 
      ...newConfig,
      // Always use Beatport credentials from environment, don't save them to config.json
      beatport: {
        username: process.env.BEATPORT_USERNAME || '',
        password: process.env.BEATPORT_PASSWORD || ''
      }
    };
    
    // Ensure data directory exists
    const dataDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2), 'utf-8');
    
    // Update the exported config object
    Object.assign(config, updatedConfig);
  } catch (error) {
    console.error('Error saving config file:', error);
    throw error;
  }
}

// Get sanitized config (without sensitive data like passwords)
export function getSanitizedConfig(): Partial<AppConfig> {
  const cfg = loadConfig();
  return {
    paths: cfg.paths,
    tools: cfg.tools,
    spotify: {
      clientId: cfg.spotify.clientId,
      clientSecret: cfg.spotify.clientSecret ? '••••••••' : '',
      redirectUri: cfg.spotify.redirectUri,
      refreshToken: cfg.spotify.refreshToken ? '••••••••' : ''
    },
    tidal: {
      clientId: cfg.tidal.clientId,
      clientSecret: cfg.tidal.clientSecret ? '••••••••' : ''
    },
    soundcloud: {
      authToken: cfg.soundcloud?.authToken ? '••••••••' : ''
    },
    beatport: {
      username: cfg.beatport.username,
      password: cfg.beatport.password ? '••••••••' : ''
    },
    monitoring: cfg.monitoring,
    logging: cfg.logging
  };
}

export const config: AppConfig = loadConfig();
