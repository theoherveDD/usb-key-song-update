import { SpotifyTrack } from '../types';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

export class SpotifyService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

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
   * Get user's liked tracks from Spotify
   * Uses refresh token for user authentication
   */
  async getLikedTracks(limit: number = 50): Promise<SpotifyTrack[]> {
    try {
      if (!config.spotify.refreshToken) {
        logger.warn('Spotify refresh token not configured - cannot fetch liked tracks');
        logger.info('Follow instructions in SPOTIFY-OAUTH-SETUP.md to get your refresh token');
        return [];
      }

      const token = await this.getUserAccessToken();

      const response = await fetch(`https://api.spotify.com/v1/me/tracks?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Spotify API failed: ${response.statusText} - ${errorText}`);
      }

      const data: any = await response.json();

      const tracks = data.items.map((item: any) => ({
        id: item.track.id,
        name: item.track.name,
        artists: item.track.artists.map((a: any) => ({ name: a.name })),
        uri: item.track.uri,
        addedAt: item.added_at
      }));

      logger.info(`Retrieved ${tracks.length} liked tracks from Spotify`);
      return tracks;

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
}
