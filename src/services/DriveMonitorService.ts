import { watch, FSWatcher } from 'chokidar';
import { existsSync } from 'fs';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

export type DriveType = 'hard_drive' | 'usb';

export class DriveMonitorService {
  private watchers: Map<DriveType, FSWatcher> = new Map();
  private driveStatus: Map<DriveType, boolean> = new Map();
  private callbacks: Map<DriveType, (connected: boolean) => void> = new Map();

  constructor() {
    this.driveStatus.set('hard_drive', false);
    this.driveStatus.set('usb', false);
  }

  start(): void {
    logger.info('Starting drive monitor service');

    // Check initial status
    this.checkDriveStatus('hard_drive', config.paths.hardDrive);
    this.checkDriveStatus('usb', config.paths.usbDrive);

    // Monitor parent directories for mount/unmount events
    this.monitorDrive('hard_drive', config.paths.hardDrive);
    this.monitorDrive('usb', config.paths.usbDrive);
  }

  private checkDriveStatus(type: DriveType, path: string): void {
    const exists = existsSync(path);
    const wasConnected = this.driveStatus.get(type);

    if (exists !== wasConnected) {
      this.driveStatus.set(type, exists);
      logger.info(`${type} ${exists ? 'connected' : 'disconnected'}: ${path}`);

      const callback = this.callbacks.get(type);
      if (callback) {
        callback(exists);
      }
    }
  }

  private monitorDrive(type: DriveType, path: string): void {
    // Watch parent directory for changes
    const parentPath = path.split('/').slice(0, -1).join('/');

    const watcher = watch(parentPath, {
      persistent: true,
      ignoreInitial: true,
      depth: 0
    });

    watcher
      .on('addDir', (dir) => {
        if (dir === path) {
          this.checkDriveStatus(type, path);
        }
      })
      .on('unlinkDir', (dir) => {
        if (dir === path) {
          this.checkDriveStatus(type, path);
        }
      });

    this.watchers.set(type, watcher);
  }

  onDriveChange(type: DriveType, callback: (connected: boolean) => void): void {
    this.callbacks.set(type, callback);
  }

  isDriveConnected(type: DriveType): boolean {
    return this.driveStatus.get(type) || false;
  }

  stop(): void {
    logger.info('Stopping drive monitor service');
    this.watchers.forEach(watcher => watcher.close());
    this.watchers.clear();
  }
}
