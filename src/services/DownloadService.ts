import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { StreamingPlatform, DownloadPlatform, DownloadStatus } from '../types';
import { AppDatabase } from '../models/database';
import { SpotifyService } from './SpotifyService';
import { TidalService } from './TidalService';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

const execAsync = promisify(exec);

export class DownloadService {
  private spotifyService: SpotifyService;
  private tidalService: TidalService;

  constructor(private db: AppDatabase) {
    this.spotifyService = new SpotifyService();
    this.tidalService = new TidalService();
  }

  async downloadNewTracks(): Promise<void> {
    logger.info('Starting download check for all platforms');

    try {
      // Run all platform downloads in parallel
      await Promise.all([
        this.downloadSoundCloudLikes(),
        this.downloadSoundCloudReposts(),
        this.downloadSpotifyToBeatport(),
        this.downloadTidalToBeatport()
      ]);

      logger.info('Download check completed for all platforms');
    } catch (error) {
      logger.error('Error during download process', error);
      throw error;
    }
  }

  /**
   * Download your liked tracks from SoundCloud
   */
  private async downloadSoundCloudLikes(): Promise<void> {
    logger.info('Downloading SoundCloud liked tracks');

    const downloadPath = join(config.paths.downloadBase, 'SoundCloud');

    try {
      // scdl command to download likes
      // -l: link to likes
      // --path: output directory
      // --onlymp3: convert to mp3
      const command = `${config.tools.scdlPath} -l https://soundcloud.com/you/likes --path "${downloadPath}" --onlymp3`;

      logger.info(`Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command, { timeout: 600000 }); // 10 min timeout

      if (stdout) logger.info(`SoundCloud likes output: ${stdout}`);
      if (stderr) logger.warn(`SoundCloud likes warnings: ${stderr}`);

      // TODO: Parse output to track downloaded files in database
      logger.info('SoundCloud likes download completed');
    } catch (error: any) {
      logger.error('SoundCloud likes download failed', { error: error.message });
      // Don't throw - let other downloads continue
    }
  }

  /**
   * Download reposts from accounts you follow on SoundCloud
   */
  private async downloadSoundCloudReposts(): Promise<void> {
    logger.info('Downloading SoundCloud reposts from followed accounts');

    const downloadPath = join(config.paths.downloadBase, 'SoundCloud');

    try {
      // TODO: Implement logic to get list of followed users
      // For now, this is a placeholder
      logger.warn('SoundCloud reposts download not fully implemented');
      logger.info('To enable: configure followed usernames in .env as SOUNDCLOUD_FOLLOWED_USERS');

      const followedUsers = process.env.SOUNDCLOUD_FOLLOWED_USERS?.split(',') || [];

      for (const username of followedUsers) {
        const trimmedUsername = username.trim();
        if (!trimmedUsername) continue;

        try {
          const command = `${config.tools.scdlPath} -l https://soundcloud.com/${trimmedUsername}/tracks --path "${downloadPath}" --onlymp3`;

          logger.info(`Downloading reposts from ${trimmedUsername}`);
          const { stdout, stderr } = await execAsync(command, { timeout: 600000 });

          if (stdout) logger.info(`SoundCloud reposts (${trimmedUsername}): ${stdout}`);
          if (stderr) logger.warn(`SoundCloud reposts warnings (${trimmedUsername}): ${stderr}`);
        } catch (error: any) {
          logger.error(`Failed to download reposts from ${trimmedUsername}`, { error: error.message });
        }
      }

      logger.info('SoundCloud reposts download completed');
    } catch (error: any) {
      logger.error('SoundCloud reposts download failed', { error: error.message });
    }
  }

  /**
   * Get Spotify liked tracks and download extended versions from Beatport
   */
  private async downloadSpotifyToBeatport(): Promise<void> {
    logger.info('Checking Spotify likes for Beatport downloads');

    if (!this.spotifyService.isConfigured()) {
      logger.warn('Spotify API not configured - skipping');
      return;
    }

    try {
      const likedTracks = await this.spotifyService.getLikedTracks(50);

      if (likedTracks.length === 0) {
        logger.info('No new Spotify liked tracks to process');
        return;
      }

      for (const track of likedTracks) {
        const artistName = track.artists.map(a => a.name).join(', ');

        // Check if already downloaded
        if (this.db.trackExists(StreamingPlatform.SPOTIFY, track.id)) {
          continue;
        }

        // Search and download from Beatport
        await this.searchAndDownloadFromBeatport(
          artistName,
          track.name,
          StreamingPlatform.SPOTIFY,
          track.id
        );
      }

      logger.info('Spotify to Beatport sync completed');
    } catch (error: any) {
      logger.error('Spotify to Beatport sync failed', { error: error.message });
    }
  }

  /**
   * Get Tidal favorite tracks and download extended versions from Beatport
   */
  private async downloadTidalToBeatport(): Promise<void> {
    logger.info('Checking Tidal favorites for Beatport downloads');

    if (!this.tidalService.isConfigured()) {
      logger.warn('Tidal API not configured - skipping');
      return;
    }

    try {
      const favoriteTracks = await this.tidalService.getFavoriteTracks(50);

      if (favoriteTracks.length === 0) {
        logger.info('No new Tidal favorite tracks to process');
        return;
      }

      for (const track of favoriteTracks) {
        const artistName = track.artists.map(a => a.name).join(', ');

        // Check if already downloaded
        if (this.db.trackExists(StreamingPlatform.TIDAL, track.id)) {
          continue;
        }

        // Search and download from Beatport
        await this.searchAndDownloadFromBeatport(
          artistName,
          track.title,
          StreamingPlatform.TIDAL,
          track.id
        );
      }

      logger.info('Tidal to Beatport sync completed');
    } catch (error: any) {
      logger.error('Tidal to Beatport sync failed', { error: error.message });
    }
  }

  /**
   * Search Beatport and download extended/DJ mix
   */
  private async searchAndDownloadFromBeatport(
    artist: string,
    title: string,
    sourcePlatform: StreamingPlatform,
    platformId: string
  ): Promise<void> {
    logger.info(`Searching Beatport for: ${artist} - ${title}`);

    const downloadPath = join(config.paths.downloadBase, 'Beatport', sourcePlatform);

    try {
      // TODO: Implement Beatport search and download logic
      // This requires beatport-dl to be properly configured
      // beatport-dl --search "artist title" --prefer-extended --output <path>

      logger.warn('Beatport download not fully implemented - requires beatport-dl configuration');
      logger.info('To enable: install and configure beatport-dl with Beatport account credentials');

      // Placeholder for beatport-dl command:
      /*
      const searchQuery = `${artist} ${title}`;
      const command = `${config.tools.beatportDlPath} --search "${searchQuery}" --prefer-extended --output "${downloadPath}"`;

      logger.info(`Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command, { timeout: 300000 });

      if (stdout) logger.info(`Beatport download output: ${stdout}`);
      if (stderr) logger.warn(`Beatport download warnings: ${stderr}`);

      // Add to database
      this.db.addTrack({
        sourcePlatform,
        downloadPlatform: DownloadPlatform.BEATPORT,
        title,
        artist,
        platformId,
        status: DownloadStatus.COMPLETED,
        mixType: 'Extended Mix', // Parse from beatport-dl output
        downloadPath: `${downloadPath}/...` // Parse from beatport-dl output
      });
      */
    } catch (error: any) {
      logger.error(`Beatport download failed for ${artist} - ${title}`, { error: error.message });
    }
  }

  async getDownloadStats(): Promise<{
    total: number;
    bySourcePlatform: Record<StreamingPlatform, number>;
    byDownloadPlatform: Record<DownloadPlatform, number>;
    byStatus: Record<DownloadStatus, number>;
  }> {
    const allTracks = this.db.getAllTracks();

    const bySourcePlatform: Record<string, number> = {};
    const byDownloadPlatform: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    allTracks.forEach(track => {
      bySourcePlatform[track.sourcePlatform] = (bySourcePlatform[track.sourcePlatform] || 0) + 1;
      byDownloadPlatform[track.downloadPlatform] = (byDownloadPlatform[track.downloadPlatform] || 0) + 1;
      byStatus[track.status] = (byStatus[track.status] || 0) + 1;
    });

    return {
      total: allTracks.length,
      bySourcePlatform: bySourcePlatform as Record<StreamingPlatform, number>,
      byDownloadPlatform: byDownloadPlatform as Record<DownloadPlatform, number>,
      byStatus: byStatus as Record<DownloadStatus, number>
    };
  }
}
