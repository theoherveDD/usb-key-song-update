import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { mkdirSync, readdirSync, renameSync, copyFileSync, unlinkSync, statSync, existsSync } from 'fs';
import { StreamingPlatform, DownloadPlatform, DownloadStatus, SpotifyTrack } from '../types';
import { AppDatabase } from '../models/database';
import { SpotifyService } from './SpotifyService';
import { TidalService } from './TidalService';
import { logger } from '../utils/logger';
import { config } from '../utils/config';
import { isTrackMatch, extractMixType } from '../utils/stringMatcher';
import { getGenreFolderPath } from '../utils/genreMapper';

const execAsync = promisify(exec);

export class DownloadService {
  private spotifyService: SpotifyService;
  private tidalService: TidalService;
  private downloadProgress = {
    isDownloading: false,
    totalTracks: 0,
    completedTracks: 0,
    currentTrack: '',
    errors: 0,
    scanProgress: {
      isScanning: false,
      likedTracksCount: 0,
      playlistsScanned: 0,
      totalPlaylists: 0,
      currentPlaylist: '',
      playlistTracksCount: 0
    }
  };

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

  /**
   * Download a single track from Spotify - tries Beatport first, then Tidal as fallback
   * WITH DUPLICATE DETECTION: Vérifie la base de données ET l'existence physique du fichier
   * @param playlistName - If provided, downloads to Playlists/{playlistName} instead of genre folder
   */
  async downloadTrackFromSpotify(artist: string, title: string, spotifyId?: string, genres?: string[], playlistName?: string): Promise<void> {
    logger.info(`Starting download for: ${artist} - ${title}`, { genres, playlistName });

    this.downloadProgress.currentTrack = `${artist} - ${title}`;

    // ✅ NOUVELLE VÉRIFICATION : Éviter les doublons
    if (spotifyId && this.db.trackExists(StreamingPlatform.SPOTIFY, spotifyId)) {
      // Vérifier si le fichier existe physiquement
      const existingTrack = this.db.getAllTracks().find(
        t => t.platformId === spotifyId && t.sourcePlatform === StreamingPlatform.SPOTIFY
      );

      if (existingTrack && existingTrack.downloadPath && existsSync(existingTrack.downloadPath)) {
        logger.info(`⏭️  Skipping (already downloaded): ${artist} - ${title}`);
        logger.info(`   📂 Location: ${existingTrack.downloadPath}`);
        this.downloadProgress.completedTracks++;
        return;
      } else if (existingTrack && existingTrack.downloadPath) {
        logger.warn(`⚠️  Track in DB but file missing: ${existingTrack.downloadPath}`);
        logger.info(`   🔄 Re-downloading...`);
      }
    }

    // Try Beatport first (prefer extended mix for electronic music)
    const beatportSuccess = await this.downloadFromBeatport(artist, title, spotifyId, genres, playlistName);
    
    if (beatportSuccess) {
      logger.info(`✅ Successfully downloaded from Beatport: ${artist} - ${title}`);
      this.downloadProgress.completedTracks++;
      return;
    }

    // ✅ FALLBACK TO TIDAL: For commercial tracks not available on Beatport
    logger.warn(`⚠️  Beatport download failed, trying Tidal as fallback...`);
    const tidalSuccess = await this.downloadFromTidal(artist, title, spotifyId, genres, playlistName);
    
    if (tidalSuccess) {
      logger.info(`✅ Successfully downloaded from Tidal (fallback): ${artist} - ${title}`);
      this.downloadProgress.completedTracks++;
      return;
    }

    // Both platforms failed
    logger.error(`❌ Download failed from both Beatport and Tidal: ${artist} - ${title}`);
    logger.info(`💡 Track may not be available on either platform, or check authentication`);
    this.downloadProgress.errors++;
  }

  /**
   * Download tracks from a specific Spotify playlist
   * Creates a dedicated folder with the playlist name (NO genre sorting)
   */
  async downloadPlaylistFromSpotify(playlistId: string): Promise<void> {
    if (this.downloadProgress.isDownloading) {
      logger.warn('Download already in progress');
      return;
    }

    logger.info(`Starting download of Spotify playlist: ${playlistId}`);

    this.downloadProgress = {
      isDownloading: true,
      totalTracks: 0,
      completedTracks: 0,
      currentTrack: 'Initializing...',
      errors: 0,
      scanProgress: {
        isScanning: true,
        likedTracksCount: 0,
        playlistsScanned: 0,
        totalPlaylists: 1,
        currentPlaylist: 'Fetching playlist info...',
        playlistTracksCount: 0
      }
    };

    try {
      // Get playlist info to get the name
      logger.info('📁 Fetching playlist info...');
      const playlistInfo = await this.spotifyService.getPlaylistInfo(playlistId);
      const playlistName = playlistInfo.name.replace(/[/\\?%*:|"<>]/g, '-'); // Clean invalid filename chars
      
      logger.info(`📁 Playlist: "${playlistName}"`);
      
      // Get playlist tracks
      logger.info('🎵 Fetching playlist tracks...');
      const playlistTracks = await this.spotifyService.getPlaylistTracks(playlistId);
      
      this.downloadProgress.scanProgress.isScanning = false;
      this.downloadProgress.scanProgress.currentPlaylist = `${playlistName} - Scan completed!`;
      this.downloadProgress.scanProgress.playlistTracksCount = playlistTracks.length;
      this.downloadProgress.totalTracks = playlistTracks.length;
      
      logger.info(`✅ Found ${playlistTracks.length} tracks in playlist "${playlistName}"`);

      // Download each track to the playlist-specific folder
      for (const track of playlistTracks) {
        const artistName = track.artists.map(a => a.name).join(', ');
        
        try {
          // Pass playlist name to download to specific folder
          await this.downloadTrackFromSpotify(artistName, track.name, track.id, track.genres, playlistName);
        } catch (error: any) {
          logger.error(`Failed to download track: ${artistName} - ${track.name}`, { error: error.message });
          this.downloadProgress.errors++;
        }
      }

      logger.info(`Playlist download completed: ${this.downloadProgress.completedTracks}/${this.downloadProgress.totalTracks} successful, ${this.downloadProgress.errors} errors`);
      logger.info(`📂 All files saved to: ${join(config.paths.hardDrive || config.paths.downloadBase, 'Playlists', playlistName)}`);

    } catch (error: any) {
      logger.error('Playlist download failed', { error: error.message });
    } finally {
      this.downloadProgress.isDownloading = false;
      this.downloadProgress.scanProgress.isScanning = false;
      this.downloadProgress.currentTrack = 'Completed';
    }
  }

  /**
   * Download ALL tracks from Spotify (liked tracks + all playlists)
   * WITH POST-DOWNLOAD RECLASSIFICATION
   */
  async downloadAllFromSpotify(): Promise<void> {
    if (this.downloadProgress.isDownloading) {
      logger.warn('Download already in progress');
      return;
    }

    logger.info('Starting download of ALL Spotify library...');

    this.downloadProgress = {
      isDownloading: true,
      totalTracks: 0,
      completedTracks: 0,
      currentTrack: 'Initializing...',
      errors: 0,
      scanProgress: {
        isScanning: true,
        likedTracksCount: 0,
        playlistsScanned: 0,
        totalPlaylists: 0,
        currentPlaylist: 'Fetching liked tracks...',
        playlistTracksCount: 0
      }
    };

    try {
      // Get all liked tracks
      logger.info('📀 Scanning Spotify liked tracks...');
      this.downloadProgress.scanProgress.currentPlaylist = 'Scanning liked tracks...';
      const likedTracks = await this.spotifyService.getLikedTracks(50);
      this.downloadProgress.scanProgress.likedTracksCount = likedTracks.length;
      logger.info(`✓ Found ${likedTracks.length} liked tracks`);
      
      // Get all playlists
      logger.info('📁 Scanning Spotify playlists...');
      this.downloadProgress.scanProgress.currentPlaylist = 'Scanning playlists...';
      const playlists = await this.spotifyService.getSavedPlaylists(50);
      this.downloadProgress.scanProgress.totalPlaylists = playlists.length;
      logger.info(`✓ Found ${playlists.length} playlists to scan`);
      
      // Get tracks from all playlists
      const playlistTracks: SpotifyTrack[] = [];
      for (const playlist of playlists) {
        try {
          this.downloadProgress.scanProgress.playlistsScanned++;
          this.downloadProgress.scanProgress.currentPlaylist = `Scanning: ${playlist.name}`;
          logger.info(`📂 Scanning playlist ${this.downloadProgress.scanProgress.playlistsScanned}/${playlists.length}: "${playlist.name}"`);
          
          const tracks = await this.spotifyService.getPlaylistTracks(playlist.id);
          playlistTracks.push(...tracks);
          
          this.downloadProgress.scanProgress.playlistTracksCount = playlistTracks.length;
          logger.info(`  ✓ ${tracks.length} tracks found (${playlistTracks.length} total from playlists)`);
          
          // DÉLAI PLUS LONG entre chaque playlist (3 secondes pour éviter rate limit)
          if (this.downloadProgress.scanProgress.playlistsScanned < playlists.length) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } catch (error: any) {
          logger.error(`Failed to get tracks from playlist ${playlist.name}`, { error: error.message });
          // Continue avec la prochaine playlist même en cas d'erreur
        }
      }

      // Scan terminé
      this.downloadProgress.scanProgress.isScanning = false;
      this.downloadProgress.scanProgress.currentPlaylist = 'Scan completed!';
      logger.info(`✅ Spotify scan complete: ${likedTracks.length} liked tracks + ${playlistTracks.length} playlist tracks`);

      // Combine and deduplicate tracks
      const allTracks = [...likedTracks, ...playlistTracks];
      const uniqueTracks = Array.from(
        new Map(allTracks.map(track => [track.id, track])).values()
      );

      this.downloadProgress.totalTracks = uniqueTracks.length;
      logger.info(`🎵 Total unique tracks to download: ${uniqueTracks.length}`);

      // Download each track
      for (const track of uniqueTracks) {
        const artistName = track.artists.map(a => a.name).join(', ');
        
        try {
          await this.downloadTrackFromSpotify(artistName, track.name, track.id, track.genres);
        } catch (error: any) {
          logger.error(`Failed to download track: ${artistName} - ${track.name}`, { error: error.message });
          this.downloadProgress.errors++;
        }
      }

      logger.info(`Download completed: ${this.downloadProgress.completedTracks}/${this.downloadProgress.totalTracks} successful, ${this.downloadProgress.errors} errors`);

      // ✅ NOUVELLE FONCTIONNALITÉ : Re-scan post-téléchargement
      logger.info('🔄 Starting post-download reclassification...');
      this.downloadProgress.currentTrack = 'Reclassifying files...';
      
      try {
        const { GenreRefinementService } = await import('./GenreRefinementService');
        const refinementService = new GenreRefinementService(this.db);
        
        const reclassifyResults = await refinementService.reclassifyOtherFolder();
        
        logger.info(`✅ Reclassification complete: ${reclassifyResults.reclassified} files moved from "Other" to specific genres`);
        
        if (reclassifyResults.details.length > 0) {
          logger.info('📊 Reclassification details:');
          reclassifyResults.details.forEach(detail => {
            logger.info(`   ${detail.file}: ${detail.oldGenre} → ${detail.newGenre}`);
          });
        }
      } catch (refinementError: any) {
        logger.error('Post-download reclassification failed', { error: refinementError.message });
      }

    } catch (error: any) {
      logger.error('Download all failed', { error: error.message });
    } finally {
      this.downloadProgress.isDownloading = false;
      this.downloadProgress.scanProgress.isScanning = false;
      this.downloadProgress.currentTrack = 'Completed';
    }
  }

  /**
   * Get current download progress
   */
  getDownloadProgress() {
    return { ...this.downloadProgress };
  }

  /**
   * Parse search results from beatport-dl output
   * Returns array of {number, artist, title}
   */
  private parseSearchResults(output: string): Array<{number: number, artist: string, title: string}> {
    const results: Array<{number: number, artist: string, title: string}> = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Parse format: "1) Artist - Title (Extended Mix)"
      // or "1. Artist - Title"
      const match = line.match(/^\s*(\d+)[\)\.][\s\-]*(.+?)\s*[\-–]\s*(.+)$/);
      if (match) {
        const number = parseInt(match[1]);
        const artist = match[2].trim();
        const title = match[3].trim();
        results.push({ number, artist, title });
        logger.info(`   [${number}] ${artist} - ${title}`);
      }
    }
    
    return results;
  }

  /**
   * Download from Beatport using beatport-dl with interactive input
   * Downloads to temp folder, then moves to genre-based folder OR playlist folder
   * WITH SMART RESULT SELECTION: Uses stringMatcher to find best match
   * @param playlistName - If provided, downloads to Playlists/{playlistName} instead of genre folder
   */
  private async downloadFromBeatport(artist: string, title: string, spotifyId?: string, genres?: string[], playlistName?: string): Promise<boolean> {
    logger.info(`🔍 Attempting Beatport download: ${artist} - ${title}`, { genres, playlistName });

    // Temporary download path
    const tempDownloadPath = join(process.cwd(), 'temp-downloads');
    
    // Final destination path - either playlist folder or genre folder
    const basePath = config.paths.hardDrive || config.paths.downloadBase;
    let finalDestPath: string;
    
    if (playlistName) {
      // Download to Playlists/{playlistName} folder
      finalDestPath = join(basePath, 'Playlists', playlistName);
      logger.info(`📁 Playlist mode: will save to ${finalDestPath}`);
    } else {
      // Download to genre-based folder
      finalDestPath = getGenreFolderPath(basePath, genres);
      logger.info(`🎨 Genre mode: will save to ${finalDestPath}`);
    }
    
    // Create destination folder if it doesn't exist
    try {
      mkdirSync(finalDestPath, { recursive: true });
      logger.info(`✓ Destination folder ready: ${finalDestPath}`);
    } catch (error: any) {
      logger.error(`Failed to create destination folder: ${error.message}`);
    }

    return new Promise((resolve) => {
      try {
        const searchQuery = `${artist} ${title}`;
        
        // Get list of files before download
        const filesBeforeDownload = new Set(readdirSync(tempDownloadPath));
        
        // Spawn beatport-dl process in ~/bin directory where config and credentials exist
        const beatportProcess = spawn(config.tools.beatportDlPath.replace('/beatport-dl-wrapper.sh', '/bin/beatport-dl'), [], {
          cwd: join(process.env.HOME || '~', 'bin'),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let hasDownloaded = false;

        let searchResultsBuffer = '';
        let isCollectingResults = false;

        beatportProcess.stdout.on('data', (data) => {
          const text = data.toString();
          output += text;
          
          // Start collecting search results
          if (text.includes('Search results:') || /\d+[\)\.][\s\-]+.+[\-–].+/.test(text)) {
            isCollectingResults = true;
          }
          
          // Collect results until prompt appears
          if (isCollectingResults && !text.includes('Enter the result number(s)')) {
            searchResultsBuffer += text;
          }
          
          // Check if search results are displayed and prompt for selection
          if (text.includes('Enter the result number(s)')) {
            isCollectingResults = false;
            
            logger.info(`📋 Search results received for: ${artist} - ${title}`);
            
            // Parse search results
            const searchResults = this.parseSearchResults(searchResultsBuffer + text);
            
            if (searchResults.length === 0) {
              logger.warn(`❌ No search results found for: ${artist} - ${title}`);
              beatportProcess.stdin.end();
              return;
            }
            
            // ✅ SMART SELECTION WITH MIX PRIORITY: Extended > Original > Radio Edit
            logger.info(`🎯 Analyzing ${searchResults.length} results to find best match...`);
            
            // Import functions from stringMatcher
            const { findBestMatchWithMixPriority, calculateSimilarity, getMixTypePriority } = require('../utils/stringMatcher');
            
            // Try with normal similarity threshold first (0.75) + mix priority
            let bestMatchIndex = findBestMatchWithMixPriority(
              artist,
              title,
              searchResults,
              0.75
            );
            
            // If no match found, try with lower threshold (0.60) for fuzzy matching
            if (bestMatchIndex === -1) {
              logger.warn(`⚠️  No exact match found, trying fuzzy matching (60% similarity)...`);
              bestMatchIndex = findBestMatchWithMixPriority(
                artist,
                title,
                searchResults,
                0.60
              );
            }
            
            // ✅ NEW: If still no match, skip Beatport and try Tidal instead
            if (bestMatchIndex === -1) {
              logger.warn(`❌ No suitable match found on Beatport (< 60% similarity)`);
              logger.info(`🔄 Skipping Beatport, will try Tidal as fallback...`);
              beatportProcess.stdin.end();
              resolve(false); // Return false to trigger Tidal fallback
              return;
            }
            
            const selectedResult = searchResults[bestMatchIndex];
            const artistSimilarity = calculateSimilarity(artist, selectedResult.artist);
            const titleSimilarity = calculateSimilarity(title, selectedResult.title);
            const mixPriority = getMixTypePriority(selectedResult.title);
            const mixType = mixPriority === 1 ? 'Extended Mix' : mixPriority === 2 ? 'Original Mix' : mixPriority === 3 ? 'Radio Edit' : 'Unknown';
            
            // ✅ NEW: Check if similarity is too low even for best match - skip to Tidal
            const combinedSimilarity = (titleSimilarity * 0.7) + (artistSimilarity * 0.3);
            
            if (combinedSimilarity < 0.65) {
              logger.warn(`⚠️  Best Beatport match has low similarity (${(combinedSimilarity * 100).toFixed(1)}%)`);
              logger.info(`   Expected: ${artist} - ${title}`);
              logger.info(`   Found: ${selectedResult.artist} - ${selectedResult.title}`);
              logger.info(`🔄 Skipping Beatport due to low relevance, will try Tidal...`);
              beatportProcess.stdin.end();
              resolve(false); // Return false to trigger Tidal fallback
              return;
            }
            
            logger.info(`✅ Best match found: [${selectedResult.number}] ${selectedResult.artist} - ${selectedResult.title}`);
            logger.info(`   📊 Similarity scores: Artist=${(artistSimilarity * 100).toFixed(1)}%, Title=${(titleSimilarity * 100).toFixed(1)}%`);
            logger.info(`   🎵 Mix type: ${mixType} (Priority: ${mixPriority}/4)`);
            
            // ✅ VERIFICATION: Warn if similarity is moderate but acceptable
            if (artistSimilarity < 0.80 || titleSimilarity < 0.80) {
              logger.warn(`⚠️  Moderate similarity detected - please verify the downloaded track`);
              logger.warn(`   Expected: ${artist} - ${title}`);
              logger.warn(`   Selected: ${selectedResult.artist} - ${selectedResult.title}`);
            }
            
            // Select the best match
            beatportProcess.stdin.write(`${selectedResult.number}\n`);
          }
          
          logger.info(`Beatport: ${text.trim()}`);
          
          // Check for successful download indicators
          if (text.includes('✓') || text.includes('updating tags') || text.includes('Download complete')) {
            hasDownloaded = true;
          }
          
          // After download, send quit signal
          if (hasDownloaded && text.includes('Enter url or search query')) {
            beatportProcess.stdin.end();
          }
        });

        beatportProcess.stderr.on('data', (data) => {
          logger.error(`Beatport error: ${data.toString()}`);
        });

        beatportProcess.on('close', async (code) => {
          if (hasDownloaded) {
            try {
              // Find newly downloaded files
              const filesAfterDownload = readdirSync(tempDownloadPath);
              const newFiles = filesAfterDownload.filter(f => !filesBeforeDownload.has(f));
              
              if (newFiles.length > 0) {
                const downloadedFile = newFiles[0]; // Get the first new file
                const tempFilePath = join(tempDownloadPath, downloadedFile);
                const finalFilePath = join(finalDestPath, downloadedFile);
                
                // ✅ FINAL VERIFICATION: Check if downloaded file matches request
                const { calculateSimilarity } = require('../utils/stringMatcher');
                const fileArtistSimilarity = calculateSimilarity(artist, downloadedFile);
                const fileTitleSimilarity = calculateSimilarity(title, downloadedFile);
                
                logger.info(`🔍 Final verification of downloaded file: ${downloadedFile}`);
                logger.info(`   📊 File similarity: Artist=${(fileArtistSimilarity * 100).toFixed(1)}%, Title=${(fileTitleSimilarity * 100).toFixed(1)}%`);
                
                if (fileArtistSimilarity < 0.50 && fileTitleSimilarity < 0.50) {
                  logger.error(`❌ Downloaded file doesn't match request - possible wrong track!`);
                  logger.error(`   Expected: ${artist} - ${title}`);
                  logger.error(`   Downloaded: ${downloadedFile}`);
                  logger.info(`💡 File will still be saved but please verify manually`);
                }
                
                // CROSS-DEVICE SAFE: Copy + Delete instead of rename
                // renameSync fails when moving between different drives/partitions
                try {
                  logger.info(`📦 Moving file from temp to destination folder...`);
                  
                  // Copy file to destination
                  copyFileSync(tempFilePath, finalFilePath);
                  
                  // Delete temp file after successful copy
                  unlinkSync(tempFilePath);
                  
                  logger.info(`✅ File saved: ${finalFilePath}`);
                } catch (moveError: any) {
                  logger.error(`Failed to move file: ${moveError.message}`);
                  resolve(false);
                  return;
                }
                
                if (spotifyId) {
                  // Check if track already exists in database
                  if (this.db.trackExists(StreamingPlatform.SPOTIFY, spotifyId)) {
                    logger.info(`💡 Track already in database, skipping database insert`);
                  } else {
                    // Extract mix type from filename or output
                    const mixType = extractMixType(downloadedFile) || 'Extended Mix';
                    
                    // Add to database
                    try {
                      this.db.addTrack({
                        sourcePlatform: StreamingPlatform.SPOTIFY,
                        downloadPlatform: DownloadPlatform.BEATPORT,
                        title,
                        artist,
                        platformId: spotifyId,
                        status: DownloadStatus.COMPLETED,
                        mixType,
                        genres,
                        downloadPath: finalFilePath
                      });
                      
                      if (playlistName) {
                        logger.info(`💾 Track saved to database for playlist: ${playlistName}`);
                        logger.info(`📂 Playlist folder: ${finalDestPath}`);
                      } else {
                        logger.info(`💾 Track saved to database with genres: ${genres?.join(', ')}`);
                        logger.info(`📂 Genre folder: ${finalDestPath}`);
                      }
                    } catch (dbError: any) {
                      logger.warn(`Database insert failed (track may already exist): ${dbError.message}`);
                    }
                  }
                }
                
                resolve(true);
              } else {
                logger.warn(`No new files found after download`);
                resolve(false);
              }
            } catch (error: any) {
              logger.error(`Failed to move file: ${error.message}`);
              resolve(false);
            }
          } else {
            logger.info(`Beatport process exited with code ${code}, no download detected`);
            resolve(false);
          }
        });

        // Send search query after a small delay
        setTimeout(() => {
          logger.info(`🔎 Sending search query: "${searchQuery}"`);
          beatportProcess.stdin.write(`${searchQuery}\n`);
        }, 500);

        // Set timeout to prevent hanging
        setTimeout(() => {
          if (!hasDownloaded) {
            logger.warn(`⏱️  Beatport download timeout (2 minutes) for: ${artist} - ${title}`);
            beatportProcess.kill();
            resolve(false);
          }
        }, 120000); // 2 minutes timeout

      } catch (error: any) {
        logger.error(`Beatport download failed: ${error.message}`);
        resolve(false);
      }
    });
  }

  /**
   * Parse Tidal search results from tidal-dl-ng output
   */
  private parseTidalSearchResults(output: string): Array<{number: number, artist: string, title: string}> {
    const results: Array<{number: number, artist: string, title: string}> = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Parse tidal-dl-ng format: "[1] Artist - Title"
      // or "1. Artist - Title"
      const match = line.match(/^\s*[\[\(]?(\d+)[\]\)]?[\.\:\)]?\s*(.+?)\s*[\-–]\s*(.+)$/);
      if (match) {
        const number = parseInt(match[1]);
        const artist = match[2].trim();
        const title = match[3].trim();
        results.push({ number, artist, title });
        logger.info(`   [${number}] ${artist} - ${title}`);
      }
    }
    
    return results;
  }

  /**
   * Download from Tidal using tidal-dl-ng with smart result selection
   * Now with genre-based folder organization and mix priority
   * Used as FALLBACK when Beatport doesn't have the track (commercial tracks)
   */
  private async downloadFromTidal(artist: string, title: string, spotifyId?: string, genres?: string[], playlistName?: string): Promise<boolean> {
    logger.info(`🎵 Attempting Tidal download (fallback): ${artist} - ${title}`, { genres, playlistName });

    // Temporary download path
    const tempDownloadPath = join(process.cwd(), 'temp-downloads');
    
    // Final destination path
    const basePath = config.paths.hardDrive || config.paths.downloadBase;
    let finalDestPath: string;
    
    if (playlistName) {
      finalDestPath = join(basePath, 'Playlists', playlistName);
      logger.info(`📁 Playlist mode: will save to ${finalDestPath}`);
    } else {
      finalDestPath = getGenreFolderPath(basePath, genres);
      logger.info(`🎨 Genre mode: will save to ${finalDestPath}`);
    }
    
    // Create destination folder
    try {
      mkdirSync(finalDestPath, { recursive: true });
      logger.info(`✓ Destination folder ready: ${finalDestPath}`);
    } catch (error: any) {
      logger.error(`Failed to create destination folder: ${error.message}`);
    }

    return new Promise((resolve) => {
      try {
        const searchQuery = `${artist} ${title}`;
        
        // Get list of files before download
        const filesBeforeDownload = new Set(readdirSync(tempDownloadPath));
        
        // Spawn tidal-dl-ng process
        const tidalProcess = spawn('tidal-dl', ['--search', searchQuery, '--output', tempDownloadPath], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let hasDownloaded = false;
        let searchResultsBuffer = '';
        let isCollectingResults = false;

        tidalProcess.stdout.on('data', (data) => {
          const text = data.toString();
          output += text;
          
          // Start collecting search results
          if (text.includes('Search results:') || /\d+[\)\.\]]\s*.+[\-–].+/.test(text)) {
            isCollectingResults = true;
          }
          
          // Collect results until prompt appears
          if (isCollectingResults && !text.includes('Select track number')) {
            searchResultsBuffer += text;
          }
          
          // Check if search results are displayed
          if (text.includes('Select track number') || text.includes('Enter selection')) {
            isCollectingResults = false;
            
            logger.info(`📋 Tidal search results received for: ${artist} - ${title}`);
            
            // Parse search results
            const searchResults = this.parseTidalSearchResults(searchResultsBuffer + text);
            
            if (searchResults.length === 0) {
              logger.warn(`❌ No Tidal results found for: ${artist} - ${title}`);
              tidalProcess.stdin.end();
              resolve(false);
              return;
            }
            
            // ✅ SMART SELECTION WITH MIX PRIORITY
            logger.info(`🎯 Analyzing ${searchResults.length} Tidal results...`);
            
            const { findBestMatchWithMixPriority, calculateSimilarity, getMixTypePriority } = require('../utils/stringMatcher');
            
            // Try with normal similarity threshold (0.75)
            let bestMatchIndex = findBestMatchWithMixPriority(
              artist,
              title,
              searchResults,
              0.75
            );
            
            // If no match, try fuzzy matching (0.60)
            if (bestMatchIndex === -1) {
              logger.warn(`⚠️  No exact match on Tidal, trying fuzzy matching (60% similarity)...`);
              bestMatchIndex = findBestMatchWithMixPriority(
                artist,
                title,
                searchResults,
                0.60
              );
            }
            
            // ✅ If still no match, Tidal also fails
            if (bestMatchIndex === -1) {
              logger.error(`❌ No suitable Tidal match found (< 60% similarity)`);
              logger.info(`💡 Track not available on Beatport or Tidal with sufficient relevance`);
              tidalProcess.stdin.end();
              resolve(false);
              return;
            }
            
            const selectedResult = searchResults[bestMatchIndex];
            const artistSimilarity = calculateSimilarity(artist, selectedResult.artist);
            const titleSimilarity = calculateSimilarity(title, selectedResult.title);
            const mixPriority = getMixTypePriority(selectedResult.title);
            const mixType = mixPriority === 1 ? 'Extended Mix' : mixPriority === 2 ? 'Original Mix' : mixPriority === 3 ? 'Radio Edit' : 'Original';
            
            // ✅ Check if Tidal result is also not relevant enough
            const combinedSimilarity = (titleSimilarity * 0.7) + (artistSimilarity * 0.3);
            
            if (combinedSimilarity < 0.65) {
              logger.warn(`⚠️  Best Tidal match has low similarity (${(combinedSimilarity * 100).toFixed(1)}%)`);
              logger.info(`   Expected: ${artist} - ${title}`);
              logger.info(`   Found: ${selectedResult.artist} - ${selectedResult.title}`);
              logger.error(`❌ Both Beatport and Tidal results not relevant enough - skipping download`);
              tidalProcess.stdin.end();
              resolve(false);
              return;
            }
            
            logger.info(`✅ Best Tidal match: [${selectedResult.number}] ${selectedResult.artist} - ${selectedResult.title}`);
            logger.info(`   📊 Similarity: Artist=${(artistSimilarity * 100).toFixed(1)}%, Title=${(titleSimilarity * 100).toFixed(1)}%`);
            logger.info(`   🎵 Mix type: ${mixType}`);
            
            if (artistSimilarity < 0.80 || titleSimilarity < 0.80) {
              logger.warn(`⚠️  Moderate similarity - please verify downloaded track`);
            }
            
            // Select the best match
            tidalProcess.stdin.write(`${selectedResult.number}\n`);
          }
          
          logger.info(`Tidal: ${text.trim()}`);
          
          // Check for download success
          if (text.includes('Download complete') || text.includes('Successfully downloaded')) {
            hasDownloaded = true;
          }
        });

        tidalProcess.stderr.on('data', (data) => {
          const errorText = data.toString();
          if (!errorText.toLowerCase().includes('warning')) {
            logger.error(`Tidal error: ${errorText}`);
          }
        });

        tidalProcess.on('close', async (code) => {
          if (hasDownloaded) {
            try {
              // Find newly downloaded files
              const filesAfterDownload = readdirSync(tempDownloadPath);
              const newFiles = filesAfterDownload.filter(f => !filesBeforeDownload.has(f));
              
              if (newFiles.length > 0) {
                const downloadedFile = newFiles[0];
                const tempFilePath = join(tempDownloadPath, downloadedFile);
                const finalFilePath = join(finalDestPath, downloadedFile);
                
                // ✅ FINAL VERIFICATION
                const { calculateSimilarity } = require('../utils/stringMatcher');
                const fileArtistSimilarity = calculateSimilarity(artist, downloadedFile);
                const fileTitleSimilarity = calculateSimilarity(title, downloadedFile);
                
                logger.info(`🔍 Tidal file verification: ${downloadedFile}`);
                logger.info(`   📊 File similarity: Artist=${(fileArtistSimilarity * 100).toFixed(1)}%, Title=${(fileTitleSimilarity * 100).toFixed(1)}%`);
                
                if (fileArtistSimilarity < 0.50 && fileTitleSimilarity < 0.50) {
                  logger.error(`❌ Downloaded file doesn't match - verify manually`);
                }
                
                // Move file
                try {
                  copyFileSync(tempFilePath, finalFilePath);
                  unlinkSync(tempFilePath);
                  logger.info(`✅ Tidal file saved: ${finalFilePath}`);
                } catch (moveError: any) {
                  logger.error(`Failed to move Tidal file: ${moveError.message}`);
                  resolve(false);
                  return;
                }
                
                // Add to database
                if (spotifyId) {
                  if (!this.db.trackExists(StreamingPlatform.SPOTIFY, spotifyId)) {
                    const mixType = extractMixType(downloadedFile) || 'Original';
                    
                    try {
                      this.db.addTrack({
                        sourcePlatform: StreamingPlatform.SPOTIFY,
                        downloadPlatform: DownloadPlatform.TIDAL,
                        title,
                        artist,
                        platformId: spotifyId,
                        status: DownloadStatus.COMPLETED,
                        mixType,
                        genres,
                        downloadPath: finalFilePath
                      });
                      
                      logger.info(`💾 Track saved to database (Tidal source)`);
                    } catch (dbError: any) {
                      logger.warn(`Database insert failed: ${dbError.message}`);
                    }
                  }
                }
                
                resolve(true);
              } else {
                logger.warn(`❌ No Tidal files found after download`);
                resolve(false);
              }
            } catch (error: any) {
              logger.error(`Failed to process Tidal download: ${error.message}`);
              resolve(false);
            }
          } else {
            logger.info(`Tidal process exited (code ${code}), no download detected`);
            resolve(false);
          }
        });

        // Send search query
        setTimeout(() => {
          logger.info(`🔎 Sending Tidal search: "${searchQuery}"`);
          tidalProcess.stdin.write(`${searchQuery}\n`);
        }, 500);

        // Timeout
        setTimeout(() => {
          if (!hasDownloaded) {
            logger.warn(`⏱️  Tidal timeout (2 minutes)`);
            tidalProcess.kill();
            resolve(false);
          }
        }, 120000);

      } catch (error: any) {
        logger.error(`Tidal download failed: ${error.message}`);
        resolve(false);
      }
    });
  }
}
