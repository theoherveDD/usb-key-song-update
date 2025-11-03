import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir, stat, copyFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';
import { AppDatabase } from '../models/database';
import { logger } from '../utils/logger';
import { config } from '../utils/config';
import { DownloadStatus } from '../types';

const execAsync = promisify(exec);

export class SyncService {
  constructor(private db: AppDatabase) {}

  async syncToUSB(): Promise<void> {
    if (!existsSync(config.paths.usbDrive)) {
      throw new Error('USB drive not connected');
    }

    logger.info('Starting USB sync process');
    const sessionId = this.db.createSyncSession();

    try {
      // Get all downloaded tracks that haven't been synced
      const tracksToSync = this.db.getTracksByStatus(DownloadStatus.COMPLETED);

      logger.info(`Found ${tracksToSync.length} tracks to sync`);

      let syncedCount = 0;
      let errorCount = 0;

      for (const track of tracksToSync) {
        try {
          if (track.downloadPath) {
            await this.copyTrackToUSB(track.downloadPath);
            this.db.updateTrackStatus(track.id, DownloadStatus.SYNCED);
            syncedCount++;
          }
        } catch (error: any) {
          logger.error(`Failed to sync track ${track.id}`, { error: error.message });
          errorCount++;
        }
      }

      // Export Rekordbox library
      await this.exportRekordboxLibrary();

      this.db.updateSyncSession(sessionId, {
        completedAt: new Date(),
        tracksSynced: syncedCount,
        errors: errorCount,
        status: errorCount > 0 ? 'failed' : 'completed'
      });

      logger.info(`USB sync completed: ${syncedCount} tracks synced, ${errorCount} errors`);
    } catch (error: any) {
      logger.error('USB sync failed', { error: error.message });
      this.db.updateSyncSession(sessionId, {
        completedAt: new Date(),
        status: 'failed'
      });
      throw error;
    }
  }

  private async copyTrackToUSB(sourcePath: string): Promise<void> {
    const fileName = basename(sourcePath);
    const destPath = join(config.paths.usbDrive, 'Music', fileName);

    // Ensure destination directory exists
    const destDir = join(config.paths.usbDrive, 'Music');
    if (!existsSync(destDir)) {
      await mkdir(destDir, { recursive: true });
    }

    // Copy file
    await copyFile(sourcePath, destPath);
    logger.debug(`Copied ${fileName} to USB`);
  }

  private async exportRekordboxLibrary(): Promise<void> {
    logger.info('Exporting Rekordbox library');

    try {
      // This is a placeholder - actual Rekordbox export depends on your setup
      // You might need to:
      // 1. Use Rekordbox CLI if available
      // 2. Manipulate Rekordbox database files directly
      // 3. Use AppleScript to automate Rekordbox app (macOS)

      // Example using osascript (macOS only):
      // const script = `
      //   tell application "rekordbox"
      //     activate
      //     -- trigger export action
      //   end tell
      // `;
      // await execAsync(`osascript -e '${script}'`);

      logger.info('Rekordbox export triggered (placeholder - implement based on your setup)');
    } catch (error: any) {
      logger.error('Rekordbox export failed', { error: error.message });
      // Don't throw - sync can continue without Rekordbox export
    }
  }

  async scanAndIndexDownloads(): Promise<number> {
    logger.info('Scanning download directory for new files');

    let indexed = 0;
    const directories = [
      'SoundCloud',
      join('Beatport', 'Spotify'),
      join('Beatport', 'Tidal')
    ];

    for (const dir of directories) {
      const dirPath = join(config.paths.downloadBase, dir);

      if (existsSync(dirPath)) {
        const files = await this.scanDirectory(dirPath);
        indexed += files.length;

        // TODO: Index files in database
        logger.info(`Found ${files.length} files in ${dir} directory`);
      }
    }

    return indexed;
  }

  private async scanDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.scanDirectory(fullPath);
          files.push(...subFiles);
        } else if (this.isAudioFile(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error: any) {
      logger.error(`Error scanning directory ${dirPath}`, { error: error.message });
    }

    return files;
  }

  private isAudioFile(filename: string): boolean {
    const audioExtensions = ['.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return audioExtensions.includes(ext);
  }
}
