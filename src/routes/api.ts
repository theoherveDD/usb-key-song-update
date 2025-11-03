import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AppDatabase } from '../models/database';
import { DownloadService } from '../services/DownloadService';
import { SyncService } from '../services/SyncService';
import { DriveMonitorService } from '../services/DriveMonitorService';
import { SpotifyService } from '../services/SpotifyService';
import { TidalService } from '../services/TidalService';
import { logger } from '../utils/logger';
import { config, saveConfig, getSanitizedConfig } from '../utils/config';
import { AppConfig } from '../types';

export function createApiRouter(
  db: AppDatabase,
  downloadService: DownloadService,
  syncService: SyncService,
  driveMonitor: DriveMonitorService
): Router {
  const router = Router();
  const spotifyService = new SpotifyService();
  const tidalService = new TidalService();

  router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  router.get('/status', async (req: Request, res: Response) => {
    try {
      const stats = await downloadService.getDownloadStats();
      res.json({
        drives: {
          hardDrive: driveMonitor.isDriveConnected('hard_drive'),
          usb: driveMonitor.isDriveConnected('usb')
        },
        downloads: stats
      });
    } catch (error: any) {
      logger.error('Error fetching status', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch status' });
    }
  });

  router.get('/config', (req: Request, res: Response) => {
    try {
      res.json({ config: getSanitizedConfig() });
    } catch (error: any) {
      logger.error('Error fetching config', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch configuration' });
    }
  });

  router.post('/config', (req: Request, res: Response) => {
    try {
      const updates: Partial<AppConfig> = req.body;
      if (updates.paths) config.paths = { ...config.paths, ...updates.paths };
      if (updates.tools) config.tools = { ...config.tools, ...updates.tools };
      if (updates.spotify) config.spotify = { ...config.spotify, ...updates.spotify };
      if (updates.tidal) config.tidal = { ...config.tidal, ...updates.tidal };
      if (updates.soundcloud) config.soundcloud = { ...config.soundcloud, ...updates.soundcloud };
      if (updates.beatport) config.beatport = { ...config.beatport, ...updates.beatport };
      if (updates.monitoring) config.monitoring = { ...config.monitoring, ...updates.monitoring };
      if (updates.logging) config.logging = { ...config.logging, ...updates.logging };
      saveConfig(config);
      logger.info('Configuration updated via API');
      res.json({ message: 'Configuration saved successfully', config: getSanitizedConfig() });
    } catch (error: any) {
      logger.error('Error saving config', { error: error.message });
      res.status(500).json({ error: 'Failed to save configuration' });
    }
  });

  router.post('/download', async (req: Request, res: Response) => {
    try {
      if (!driveMonitor.isDriveConnected('hard_drive')) {
        return res.status(400).json({ error: 'Hard drive not connected' });
      }
      logger.info('Manual download triggered via API');
      downloadService.downloadNewTracks().catch((err: any) => logger.error('Background download failed', err));
      res.json({ message: 'Download started' });
    } catch (error: any) {
      logger.error('Error starting download', { error: error.message });
      res.status(500).json({ error: 'Failed to start download' });
    }
  });

  router.post('/sync', async (req: Request, res: Response) => {
    try {
      if (!driveMonitor.isDriveConnected('usb')) {
        return res.status(400).json({ error: 'USB drive not connected' });
      }
      logger.info('Manual sync triggered via API');
      await syncService.syncToUSB();
      res.json({ message: 'Sync completed successfully' });
    } catch (error: any) {
      logger.error('Error during sync', { error: error.message });
      res.status(500).json({ error: 'Sync failed' });
    }
  });

  router.get('/tracks', (req: Request, res: Response) => {
    try {
      const { sourcePlatform, downloadPlatform, status } = req.query;
      let tracks;
      if (sourcePlatform) tracks = db.getTracksBySourcePlatform(sourcePlatform as any);
      else if (downloadPlatform) tracks = db.getTracksByDownloadPlatform(downloadPlatform as any);
      else if (status) tracks = db.getTracksByStatus(status as any);
      else tracks = db.getAllTracks();
      res.json({ tracks });
    } catch (error: any) {
      logger.error('Error fetching tracks', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch tracks' });
    }
  });

  router.get('/spotify/liked', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const tracks = await spotifyService.getLikedTracks(limit);
      res.json({ tracks });
    } catch (error: any) {
      logger.error('Error fetching Spotify liked tracks', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch Spotify liked tracks' });
    }
  });

  // OAuth 2.0 routes for Spotify
  router.get('/spotify/auth', (req: Request, res: Response) => {
    try {
      const authUrl = spotifyService.getAuthorizationUrl();
      logger.info('Generated Spotify authorization URL');
      res.json({ authUrl });
    } catch (error: any) {
      logger.error('Error generating Spotify auth URL', { error: error.message });
      res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
  });

  router.get('/spotify/callback', async (req: Request, res: Response) => {
    try {
      const { code, error } = req.query;

      if (error) {
        logger.error('Spotify authorization error', { error });
        return res.redirect(`/?error=${encodeURIComponent(error as string)}`);
      }

      if (!code) {
        return res.status(400).json({ error: 'Authorization code missing' });
      }

      const tokens = await spotifyService.exchangeCodeForTokens(code as string);

      // Save refresh token to config
      config.spotify.refreshToken = tokens.refreshToken;
      saveConfig(config);

      logger.info('Spotify connected successfully - refresh token saved');

      // Redirect to home with success message
      res.redirect('/?spotify_connected=true');
    } catch (error: any) {
      logger.error('Error handling Spotify callback', { error: error.message });
      res.redirect(`/?error=${encodeURIComponent(error.message)}`);
    }
  });

  router.get('/spotify/status', (req: Request, res: Response) => {
    try {
      const isConfigured = spotifyService.isConfigured();
      res.json({
        connected: isConfigured,
        hasClientId: !!config.spotify.clientId,
        hasClientSecret: !!config.spotify.clientSecret,
        hasRefreshToken: !!config.spotify.refreshToken
      });
    } catch (error: any) {
      logger.error('Error checking Spotify status', { error: error.message });
      res.status(500).json({ error: 'Failed to check Spotify status' });
    }
  });

  router.post('/spotify/disconnect', (req: Request, res: Response) => {
    try {
      config.spotify.refreshToken = '';
      saveConfig(config);
      logger.info('Spotify disconnected - refresh token removed');
      res.json({ message: 'Spotify disconnected successfully' });
    } catch (error: any) {
      logger.error('Error disconnecting Spotify', { error: error.message });
      res.status(500).json({ error: 'Failed to disconnect Spotify' });
    }
  });

  router.get('/tidal/liked', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const tracks = await tidalService.getFavoriteTracks(limit);
      res.json({ tracks });
    } catch (error: any) {
      logger.error('Error fetching Tidal favorite tracks', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch Tidal favorite tracks' });
    }
  });

  router.post('/scan', async (req: Request, res: Response) => {
    try {
      const count = await syncService.scanAndIndexDownloads();
      res.json({ message: `Scanned and found ${count} files` });
    } catch (error: any) {
      logger.error('Error scanning downloads', { error: error.message });
      res.status(500).json({ error: 'Scan failed' });
    }
  });

  // File system browser endpoints
  router.get('/filesystem/volumes', (req: Request, res: Response) => {
    try {
      // List mounted volumes (macOS specific)
      const volumesPath = '/Volumes';
      if (fs.existsSync(volumesPath)) {
        const volumes = fs.readdirSync(volumesPath)
          .filter(name => {
            try {
              const stats = fs.statSync(path.join(volumesPath, name));
              return stats.isDirectory();
            } catch {
              return false;
            }
          })
          .map(name => ({
            name,
            path: path.join(volumesPath, name)
          }));
        
        // Add home directory and common locations
        const homeDir = process.env.HOME || '/Users';
        const commonPaths = [
          { name: '🏠 Home', path: homeDir },
          { name: '📁 Desktop', path: path.join(homeDir, 'Desktop') },
          { name: '📂 Documents', path: path.join(homeDir, 'Documents') },
          { name: '💾 Applications', path: '/Applications' },
          ...volumes.map(v => ({ name: `💿 ${v.name}`, path: v.path }))
        ].filter(p => {
          try {
            return fs.existsSync(p.path) && fs.statSync(p.path).isDirectory();
          } catch {
            return false;
          }
        });

        res.json({ volumes: commonPaths });
      } else {
        res.json({ volumes: [] });
      }
    } catch (error: any) {
      logger.error('Error listing volumes', { error: error.message });
      res.status(500).json({ error: 'Failed to list volumes' });
    }
  });

  router.get('/filesystem/browse', (req: Request, res: Response) => {
    try {
      const dirPath = (req.query.path as string) || process.env.HOME || '/';
      
      if (!fs.existsSync(dirPath)) {
        return res.status(404).json({ error: 'Path not found' });
      }

      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: 'Path is not a directory' });
      }

      const items = fs.readdirSync(dirPath)
        .map(name => {
          try {
            const itemPath = path.join(dirPath, name);
            const itemStats = fs.statSync(itemPath);
            return {
              name,
              path: itemPath,
              isDirectory: itemStats.isDirectory(),
              size: itemStats.size,
              modified: itemStats.mtime
            };
          } catch {
            return null;
          }
        })
        .filter(item => item !== null && item.isDirectory) // Only directories
        .sort((a, b) => a!.name.localeCompare(b!.name));

      const parentPath = path.dirname(dirPath);
      
      res.json({
        currentPath: dirPath,
        parentPath: parentPath !== dirPath ? parentPath : null,
        items
      });
    } catch (error: any) {
      logger.error('Error browsing directory', { error: error.message });
      res.status(500).json({ error: 'Failed to browse directory' });
    }
  });

  return router;
}
