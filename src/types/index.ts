export enum StreamingPlatform {
  SOUNDCLOUD = 'soundcloud',
  TIDAL = 'tidal',
  SPOTIFY = 'spotify'
}

export enum DownloadPlatform {
  SOUNDCLOUD = 'soundcloud',
  BEATPORT = 'beatport',
  TIDAL = 'tidal'
}

export enum DownloadStatus {
  PENDING = 'pending',
  DOWNLOADING = 'downloading',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SYNCED = 'synced'
}

export interface Track {
  id: string;
  sourcePlatform: StreamingPlatform; // Where the track was discovered (spotify, tidal, soundcloud)
  downloadPlatform: DownloadPlatform; // Where it was downloaded from (beatport, soundcloud)
  title: string;
  artist: string;
  platformId: string;
  platformUrl?: string;
  downloadPath?: string;
  status: DownloadStatus;
  mixType?: string; // e.g., "Extended Mix", "Original Mix", null for SoundCloud
  genres?: string[]; // Genres for organizing files by folder
  downloadedAt?: Date;
  syncedAt?: Date;
  fileSize?: number;
  duration?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncSession {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  tracksDownloaded: number;
  tracksSynced: number;
  errors: number;
  status: 'running' | 'completed' | 'failed';
}

export interface AppConfig {
  paths: {
    hardDrive: string;
    usbDrive: string;
    downloadBase: string;
    rekordboxDb: string;
  };
  tools: {
    scdlPath: string;
    beatportDlPath: string;
  };
  spotify: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    refreshToken?: string;
  };
  tidal: {
    clientId: string;
    clientSecret: string;
  };
  soundcloud: {
    authToken: string;
  };
  beatport: {
    username: string;
    password: string;
  };
  monitoring: {
    checkInterval: number;
    autoSyncEnabled: boolean;
  };
  logging: {
    level: string;
    file: string;
  };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  uri: string;
  addedAt: string;
  genres?: string[]; // Artist genres from Spotify
  album?: {
    name: string;
    releaseDate: string;
  };
}

export interface TidalTrack {
  id: string;
  title: string;
  artists: { name: string }[];
  url: string;
}
