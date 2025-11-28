import { SpotifyTrack } from '../types';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

export class SpotifyService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private genreCache: Map<string, string[]> = new Map(); // Cache artist ID -> genres
  private lastApiCallTime: number = 0;
  private minDelayBetweenCalls: number = 500; // Minimum 500ms entre chaque appel API

  constructor() {}

  /**
   * Generate Spotify OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const scopes = [
      'user-library-read',
      'user-follow-read',
      'user-read-recently-played',
      'playlist-read-private'
    ];

    const params = new URLSearchParams({
      client_id: config.spotify.clientId,
      response_type: 'code',
      redirect_uri: config.spotify.redirectUri,
      scope: scopes.join(' '),
      state: state || Math.random().toString(36).substring(7)
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      logger.info('Exchanging Spotify code for tokens', { 
        clientId: config.spotify.clientId,
        clientSecretLength: config.spotify.clientSecret?.length || 0,
        redirectUri: config.spotify.redirectUri 
      });

      const authString = Buffer.from(
        `${config.spotify.clientId}:${config.spotify.clientSecret}`
      ).toString('base64');

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: config.spotify.redirectUri
        }).toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Spotify token exchange failed', { 
          status: response.status,
          statusText: response.statusText,
          error: errorText 
        });
        throw new Error(`Spotify token exchange failed: ${response.statusText} - ${errorText}`);
      }

      const data: any = await response.json();

      logger.info('Successfully exchanged Spotify authorization code for tokens');

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in
      };
    } catch (error: any) {
      logger.error('Failed to exchange Spotify code for tokens', { error: error.message });
      throw error;
    }
  }

  /**
   * Get access token using refresh token (for user data access)
   */
  private async getUserAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!config.spotify.refreshToken) {
      throw new Error('Spotify refresh token not configured');
    }

    try {
      const authString = Buffer.from(
        `${config.spotify.clientId}:${config.spotify.clientSecret}`
      ).toString('base64');

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: config.spotify.refreshToken
        }).toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Spotify token refresh failed: ${response.statusText} - ${errorText}`);
      }

      const data: any = await response.json();
      this.accessToken = data.access_token as string;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early

      logger.info('Spotify user access token obtained via refresh token');
      return this.accessToken!;
    } catch (error: any) {
      logger.error('Failed to get Spotify user access token', { error: error.message });
      throw error;
    }
  }

  /**
   * Get access token using client credentials flow (for public data)
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const authString = Buffer.from(
        `${config.spotify.clientId}:${config.spotify.clientSecret}`
      ).toString('base64');

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error(`Spotify auth failed: ${response.statusText}`);
      }

      const data: any = await response.json();
      this.accessToken = data.access_token as string;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early

      logger.info('Spotify access token obtained');
      return this.accessToken!;
    } catch (error: any) {
      logger.error('Failed to get Spotify access token', { error: error.message });
      throw error;
    }
  }

  /**
   * Attendre avant de faire un appel API pour respecter le rate limiting
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCallTime;
    
    if (timeSinceLastCall < this.minDelayBetweenCalls) {
      const waitTime = this.minDelayBetweenCalls - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastApiCallTime = Date.now();
  }

  /**
   * Get genres from artist IDs - OPTIMIZED WITH BATCHING AND CACHING
   * Spotify doesn't provide genres at track level, only at artist level
   * Cette fonction batch les artistes et utilise un cache pour éviter les appels répétés
   */
  private async getArtistGenres(artistIds: string[], token: string): Promise<string[]> {
    try {
      if (artistIds.length === 0) return [];

      // Vérifier le cache d'abord
      const uncachedIds: string[] = [];
      const cachedGenres: string[] = [];
      
      for (const id of artistIds) {
        if (this.genreCache.has(id)) {
          cachedGenres.push(...this.genreCache.get(id)!);
        } else {
          uncachedIds.push(id);
        }
      }

      // Si tout est en cache, retourner immédiatement
      if (uncachedIds.length === 0) {
        return Array.from(new Set(cachedGenres));
      }

      // Attendre avant de faire l'appel API
      await this.waitForRateLimit();

      // Get up to 50 artists at once (limite Spotify)
      const ids = uncachedIds.slice(0, 50).join(',');
      
      let retries = 0;
      const maxRetries = 5;
      let response: Response | null = null;

      // Retry loop avec exponential backoff
      while (retries < maxRetries) {
        try {
          response = await fetch(`https://api.spotify.com/v1/artists?ids=${ids}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.status === 429) {
            // Rate limited
            const retryAfter = parseInt(response.headers.get('Retry-After') || '10');
            const waitTime = retryAfter * 1000;
            logger.warn(`⏳ Rate limited on artist genres. Waiting ${retryAfter}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retries++;
            continue;
          }

          if (response.ok) {
            break; // Succès !
          }

          // Autre erreur
          logger.warn(`Failed to fetch artist genres: ${response.status} ${response.statusText}`);
          return Array.from(new Set(cachedGenres)); // Retourner ce qu'on a en cache

        } catch (error: any) {
          if (retries >= maxRetries - 1) {
            logger.error('Max retries reached for artist genres', { error: error.message });
            return Array.from(new Set(cachedGenres));
          }
          
          const backoffTime = Math.min(1000 * Math.pow(2, retries), 30000); // Max 30s
          logger.warn(`Request error, retry ${retries + 1}/${maxRetries} after ${backoffTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          retries++;
        }
      }

      if (!response || !response.ok) {
        return Array.from(new Set(cachedGenres));
      }

      const data: any = await response.json();
      
      // Collect all unique genres from all artists ET mettre en cache
      const allGenres = new Set<string>(cachedGenres);
      
      data.artists.forEach((artist: any) => {
        if (artist && artist.genres) {
          const genres = artist.genres as string[];
          
          // Mettre en cache pour cet artiste
          this.genreCache.set(artist.id, genres);
          
          // Ajouter aux genres totaux
          genres.forEach(genre => allGenres.add(genre));
        }
      });

      return Array.from(allGenres);

    } catch (error: any) {
      logger.error('Failed to get artist genres', { error: error.message });
      return [];
    }
  }

  /**
   * Batch fetch genres for multiple tracks at once
   * Collecte tous les artist IDs uniques et fait UN seul appel API
   */
  private async batchFetchGenres(tracks: any[], token: string): Promise<Map<string, string[]>> {
    const genresMap = new Map<string, string[]>();
    
    // Collecter tous les artist IDs uniques de tous les tracks
    const allArtistIds = new Set<string>();
    tracks.forEach(track => {
      if (track.artists) {
        track.artists.forEach((artist: any) => {
          if (artist.id) allArtistIds.add(artist.id);
        });
      }
    });

    const uniqueArtistIds = Array.from(allArtistIds);
    logger.info(`🎨 Fetching genres for ${uniqueArtistIds.length} unique artists...`);

    // Batch par groupes de 50 (limite Spotify)
    for (let i = 0; i < uniqueArtistIds.length; i += 50) {
      const batch = uniqueArtistIds.slice(i, i + 50);
      const genres = await this.getArtistGenres(batch, token);
      
      // Associer les genres à chaque artiste du batch
      batch.forEach(artistId => {
        if (this.genreCache.has(artistId)) {
          genresMap.set(artistId, this.genreCache.get(artistId)!);
        }
      });

      // Petit délai entre les batches
      if (i + 50 < uniqueArtistIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return genresMap;
  }

  /**
   * Get user's liked tracks from Spotify
   * Uses refresh token for user authentication
   * Now includes genres from artist data
   * Fetches ALL tracks with pagination (no limit)
   * With rate limit handling and exponential backoff
   * OPTIMIZED: Batch fetch genres pour tous les tracks d'un coup
   */
  async getLikedTracks(limit: number = 50): Promise<SpotifyTrack[]> {
    try {
      if (!config.spotify.refreshToken) {
        logger.warn('Spotify refresh token not configured - cannot fetch liked tracks');
        logger.info('Follow instructions in SPOTIFY-OAUTH-SETUP.md to get your refresh token');
        return [];
      }

      const token = await this.getUserAccessToken();
      const allTracksRaw: any[] = [];
      let offset = 0;
      const batchSize = 50; // Spotify API max limit per request

      logger.info('📀 Fetching liked tracks from Spotify...');

      // PHASE 1: Récupérer tous les tracks SANS genres (rapide)
      while (true) {
        let retries = 0;
        const maxRetries = 5;
        let success = false;
        let data: any;

        await this.waitForRateLimit();

        // Retry loop pour rate limiting
        while (retries < maxRetries && !success) {
          try {
            const response = await fetch(`https://api.spotify.com/v1/me/tracks?limit=${batchSize}&offset=${offset}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.status === 429) {
              const retryAfter = parseInt(response.headers.get('Retry-After') || '10');
              logger.warn(`⏳ Rate limited on liked tracks. Waiting ${retryAfter}s...`);
              await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
              retries++;
              continue;
            }

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Spotify API failed: ${response.statusText} - ${errorText}`);
            }

            data = await response.json();
            success = true;

          } catch (error: any) {
            if (retries >= maxRetries - 1) {
              throw error;
            }
            const backoffTime = Math.min(1000 * Math.pow(2, retries), 30000);
            logger.warn(`⚠️  Request failed, retry ${retries + 1}/${maxRetries} after ${backoffTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            retries++;
          }
        }

        if (!success || !data || data.items.length === 0) {
          break;
        }

        allTracksRaw.push(...data.items);
        logger.info(`  ✓ Fetched ${allTracksRaw.length} liked tracks...`);

        if (data.next === null || data.items.length < batchSize) {
          break;
        }

        offset += batchSize;
        await new Promise(resolve => setTimeout(resolve, 800)); // 800ms entre batches
      }

      logger.info(`✅ Retrieved ${allTracksRaw.length} liked tracks`);

      // PHASE 2: Batch fetch genres pour TOUS les tracks en une fois
      logger.info('🎨 Fetching genres for all artists...');
      await this.batchFetchGenres(
        allTracksRaw.map(item => item.track),
        token
      );

      // PHASE 3: Construire les tracks finaux avec genres depuis le cache
      const allTracks: SpotifyTrack[] = allTracksRaw.map(item => {
        const track = item.track;
        const artistIds = track.artists.map((a: any) => a.id);
        
        // Récupérer genres depuis le cache
        const genres = new Set<string>();
        artistIds.forEach((id: string) => {
          if (this.genreCache.has(id)) {
            this.genreCache.get(id)!.forEach(g => genres.add(g));
          }
        });

        return {
          id: track.id,
          name: track.name,
          artists: track.artists.map((a: any) => ({ name: a.name })),
          uri: track.uri,
          addedAt: item.added_at,
          genres: Array.from(genres),
          album: {
            name: track.album.name,
            releaseDate: track.album.release_date
          }
        };
      });

      logger.info(`✅ Total: ${allTracks.length} liked tracks with genre data`);
      return allTracks;

    } catch (error: any) {
      logger.error('Failed to get Spotify liked tracks', { error: error.message });
      throw error;
    }
  }

  /**
   * Search Spotify for track info (useful for verification)
   */
  async searchTrack(artist: string, title: string): Promise<SpotifyTrack | null> {
    try {
      const token = await this.getAccessToken();
      const query = encodeURIComponent(`artist:${artist} track:${title}`);

      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Spotify search failed: ${response.statusText}`);
      }

      const data: any = await response.json();

      if (data.tracks.items.length === 0) {
        return null;
      }

      const track: any = data.tracks.items[0];
      return {
        id: track.id,
        name: track.name,
        artists: track.artists.map((a: any) => ({ name: a.name })),
        uri: track.uri,
        addedAt: ''
      };
    } catch (error: any) {
      logger.error('Spotify track search failed', { error: error.message });
      return null;
    }
  }

  /**
   * Check if Spotify credentials are configured
   */
  isConfigured(): boolean {
    return !!(config.spotify.clientId && config.spotify.clientSecret && config.spotify.refreshToken);
  }

  /**
   * Get user's saved/followed playlists
   * Fetches ALL playlists with pagination and rate limit handling
   */
  async getSavedPlaylists(limit: number = 50): Promise<any[]> {
    try {
      if (!config.spotify.refreshToken) {
        logger.warn('Spotify refresh token not configured - cannot fetch playlists');
        return [];
      }

      const token = await this.getUserAccessToken();
      const allPlaylists: any[] = [];
      let offset = 0;
      const batchSize = 50;

      logger.info('📁 Fetching playlists from Spotify...');

      while (true) {
        let retries = 0;
        const maxRetries = 5;
        let success = false;
        let data: any;

        await this.waitForRateLimit();

        while (retries < maxRetries && !success) {
          try {
            const response = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${batchSize}&offset=${offset}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.status === 429) {
              const retryAfter = parseInt(response.headers.get('Retry-After') || '10');
              logger.warn(`⏳ Rate limited on playlists. Waiting ${retryAfter}s...`);
              await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
              retries++;
              continue;
            }

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Spotify API failed: ${response.statusText} - ${errorText}`);
            }

            data = await response.json();
            success = true;

          } catch (error: any) {
            if (retries >= maxRetries - 1) {
              throw error;
            }
            const backoffTime = Math.min(1000 * Math.pow(2, retries), 30000);
            logger.warn(`⚠️  Request failed, retry ${retries + 1}/${maxRetries} after ${backoffTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            retries++;
          }
        }

        if (!success || !data || data.items.length === 0) {
          break;
        }

        allPlaylists.push(...data.items);
        logger.info(`  ✓ Fetched ${allPlaylists.length} playlists...`);

        if (data.next === null || data.items.length < batchSize) {
          break;
        }

        offset += batchSize;
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      logger.info(`✅ Retrieved ${allPlaylists.length} total playlists`);
      return allPlaylists;

    } catch (error: any) {
      logger.error('Failed to get Spotify playlists', { error: error.message });
      throw error;
    }
  }

  /**
   * Get playlist info (name, description, etc.)
   */
  async getPlaylistInfo(playlistId: string): Promise<{ id: string; name: string; description: string; owner: string }> {
    try {
      if (!config.spotify.refreshToken) {
        logger.warn('Spotify refresh token not configured - cannot fetch playlist info');
        throw new Error('Spotify not authenticated');
      }

      const token = await this.getUserAccessToken();
      await this.waitForRateLimit();

      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Spotify API failed: ${response.statusText} - ${errorText}`);
      }

      const data: any = await response.json();
      
      return {
        id: data.id,
        name: data.name,
        description: data.description || '',
        owner: data.owner.display_name || data.owner.id
      };

    } catch (error: any) {
      logger.error('Failed to get playlist info', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all tracks from a specific playlist
   * Now includes genres from artist data
   * Fetches ALL tracks with pagination
   * OPTIMIZED: Batch fetch genres après avoir récupéré tous les tracks
   */
  async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
    try {
      if (!config.spotify.refreshToken) {
        logger.warn('Spotify refresh token not configured - cannot fetch playlist tracks');
        return [];
      }

      const token = await this.getUserAccessToken();
      const allTracksRaw: any[] = [];
      let offset = 0;
      const batchSize = 100; // Playlist tracks can go up to 100 per request

      // PHASE 1: Récupérer tous les tracks SANS genres
      while (true) {
        let retries = 0;
        const maxRetries = 5;
        let success = false;
        let data: any;

        await this.waitForRateLimit();

        while (retries < maxRetries && !success) {
          try {
            const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${batchSize}&offset=${offset}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.status === 429) {
              const retryAfter = parseInt(response.headers.get('Retry-After') || '10');
              logger.warn(`⏳ Rate limited on playlist tracks. Waiting ${retryAfter}s...`);
              await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
              retries++;
              continue;
            }

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Spotify API failed: ${response.statusText} - ${errorText}`);
            }

            data = await response.json();
            success = true;

          } catch (error: any) {
            if (retries >= maxRetries - 1) {
              throw error;
            }
            const backoffTime = Math.min(1000 * Math.pow(2, retries), 30000);
            logger.warn(`⚠️  Request failed, retry ${retries + 1}/${maxRetries} after ${backoffTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            retries++;
          }
        }

        if (!success || !data || data.items.length === 0) {
          break;
        }

        // Filter out null tracks
        const validTracks = data.items.filter((item: any) => item.track);
        allTracksRaw.push(...validTracks);

        if (data.next === null || data.items.length < batchSize) {
          break;
        }

        offset += batchSize;
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      logger.info(`  📂 Retrieved ${allTracksRaw.length} tracks from playlist`);

      // PHASE 2: Batch fetch genres pour tous les tracks de la playlist
      if (allTracksRaw.length > 0) {
        await this.batchFetchGenres(
          allTracksRaw.map(item => item.track),
          token
        );

        // PHASE 3: Construire les tracks finaux avec genres depuis le cache
        const allTracks: SpotifyTrack[] = allTracksRaw.map(item => {
          const track = item.track;
          const artistIds = track.artists.map((a: any) => a.id);
          
          // Récupérer genres depuis le cache
          const genres = new Set<string>();
          artistIds.forEach((id: string) => {
            if (this.genreCache.has(id)) {
              this.genreCache.get(id)!.forEach(g => genres.add(g));
            }
          });

          return {
            id: track.id,
            name: track.name,
            artists: track.artists.map((a: any) => ({ name: a.name })),
            uri: track.uri,
            addedAt: item.added_at,
            genres: Array.from(genres),
            album: {
              name: track.album.name,
              releaseDate: track.album.release_date
            }
          };
        });

        logger.info(`  ✓ ${allTracks.length} tracks with genre data`);
        return allTracks;
      }

      return [];

    } catch (error: any) {
      logger.error('Failed to get playlist tracks', { error: error.message });
      throw error;
    }
  }
}
