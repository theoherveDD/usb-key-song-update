import cron from 'node-cron';
import { AppDatabase } from './models/database';
import { DriveMonitorService } from './services/DriveMonitorService';
import { DownloadService } from './services/DownloadService';
import { SyncService } from './services/SyncService';
import { logger } from './utils/logger';
import { config } from './utils/config';

class DaemonService {
  private db: AppDatabase;
  private driveMonitor: DriveMonitorService;
  private downloadService: DownloadService;
  private syncService: SyncService;
  private downloadTask?: cron.ScheduledTask;

  constructor() {
    this.db = new AppDatabase('./data/app.db');
    this.driveMonitor = new DriveMonitorService();
    this.downloadService = new DownloadService(this.db);
    this.syncService = new SyncService(this.db);
  }

  async start(): Promise<void> {
    logger.info('Starting USB Key Song Update Daemon');

    // Start drive monitoring
    this.driveMonitor.start();

    // Set up drive event handlers
    this.driveMonitor.onDriveChange('hard_drive', async (connected) => {
      if (connected) {
        logger.info('Hard drive connected - starting download check');
        await this.handleHardDriveConnected();
      } else {
        logger.info('Hard drive disconnected');
        this.stopDownloadMonitoring();
      }
    });

    this.driveMonitor.onDriveChange('usb', async (connected) => {
      if (connected) {
        logger.info('USB drive connected - starting sync process');
        await this.handleUSBConnected();
      } else {
        logger.info('USB drive disconnected');
      }
    });

    // If hard drive is already connected, start monitoring
    if (this.driveMonitor.isDriveConnected('hard_drive')) {
      await this.handleHardDriveConnected();
    }

    logger.info('Daemon started successfully');
  }

  private async handleHardDriveConnected(): Promise<void> {
    try {
      // Run initial download check
      await this.downloadService.downloadNewTracks();

      // Set up periodic checking if auto-sync is enabled
      if (config.monitoring.autoSyncEnabled) {
        this.startDownloadMonitoring();
      }
    } catch (error: any) {
      logger.error('Error handling hard drive connection', { error: error.message });
    }
  }

  private startDownloadMonitoring(): void {
    if (this.downloadTask) {
      return; // Already running
    }

    const schedule = `*/${config.monitoring.checkInterval} * * * *`;
    logger.info(`Scheduling download checks every ${config.monitoring.checkInterval} minutes`);

    this.downloadTask = cron.schedule(schedule, async () => {
      logger.info('Running scheduled download check');
      try {
        await this.downloadService.downloadNewTracks();
        const stats = await this.downloadService.getDownloadStats();
        logger.info('Download stats', stats);
      } catch (error: any) {
        logger.error('Scheduled download check failed', { error: error.message });
      }
    });

    this.downloadTask.start();
  }

  private stopDownloadMonitoring(): void {
    if (this.downloadTask) {
      this.downloadTask.stop();
      this.downloadTask = undefined;
      logger.info('Stopped download monitoring');
    }
  }

  private async handleUSBConnected(): Promise<void> {
    try {
      // Small delay to ensure drive is fully mounted
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Run sync process
      await this.syncService.syncToUSB();
    } catch (error: any) {
      logger.error('Error handling USB connection', { error: error.message });
    }
  }

  stop(): void {
    logger.info('Stopping daemon');
    this.stopDownloadMonitoring();
    this.driveMonitor.stop();
    this.db.close();
  }
}

// Main execution
const daemon = new DaemonService();

// Handle shutdown signals
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  daemon.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  daemon.stop();
  process.exit(0);
});

// Start daemon
daemon.start().catch((error) => {
  logger.error('Failed to start daemon', error);
  process.exit(1);
});
