import Database from 'better-sqlite3';
import { Track, SyncSession, StreamingPlatform, DownloadPlatform, DownloadStatus } from '../types';
import { logger } from '../utils/logger';

export class AppDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './data/app.db') {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        source_platform TEXT NOT NULL,
        download_platform TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        platform_id TEXT NOT NULL,
        platform_url TEXT,
        download_path TEXT,
        status TEXT NOT NULL,
        mix_type TEXT,
        downloaded_at INTEGER,
        synced_at INTEGER,
        file_size INTEGER,
        duration INTEGER,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(source_platform, platform_id)
      );

      CREATE TABLE IF NOT EXISTS sync_sessions (
        id TEXT PRIMARY KEY,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        tracks_downloaded INTEGER DEFAULT 0,
        tracks_synced INTEGER DEFAULT 0,
        errors INTEGER DEFAULT 0,
        status TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tracks_source_platform ON tracks(source_platform);
      CREATE INDEX IF NOT EXISTS idx_tracks_download_platform ON tracks(download_platform);
      CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks(status);
      CREATE INDEX IF NOT EXISTS idx_tracks_downloaded_at ON tracks(downloaded_at);
    `);

    logger.info('Database schema initialized');
  }

  // Track operations
  addTrack(track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = this.generateId();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO tracks (
        id, source_platform, download_platform, title, artist, platform_id, platform_url,
        download_path, status, mix_type, downloaded_at, synced_at, file_size,
        duration, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      track.sourcePlatform,
      track.downloadPlatform,
      track.title,
      track.artist,
      track.platformId,
      track.platformUrl || null,
      track.downloadPath || null,
      track.status,
      track.mixType || null,
      track.downloadedAt?.getTime() || null,
      track.syncedAt?.getTime() || null,
      track.fileSize || null,
      track.duration || null,
      track.metadata ? JSON.stringify(track.metadata) : null,
      now,
      now
    );

    return id;
  }

  updateTrackStatus(id: string, status: DownloadStatus, additionalData?: Partial<Track>): void {
    const updates: string[] = ['status = ?', 'updated_at = ?'];
    const values: any[] = [status, Date.now()];

    if (additionalData?.downloadPath) {
      updates.push('download_path = ?');
      values.push(additionalData.downloadPath);
    }

    if (additionalData?.fileSize) {
      updates.push('file_size = ?');
      values.push(additionalData.fileSize);
    }

    if (status === DownloadStatus.COMPLETED && !additionalData?.downloadedAt) {
      updates.push('downloaded_at = ?');
      values.push(Date.now());
    }

    if (status === DownloadStatus.SYNCED && !additionalData?.syncedAt) {
      updates.push('synced_at = ?');
      values.push(Date.now());
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE tracks SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
  }

  getTracksBySourcePlatform(platform: StreamingPlatform): Track[] {
    const stmt = this.db.prepare('SELECT * FROM tracks WHERE source_platform = ?');
    return this.mapRowsToTracks(stmt.all(platform));
  }

  getTracksByDownloadPlatform(platform: DownloadPlatform): Track[] {
    const stmt = this.db.prepare('SELECT * FROM tracks WHERE download_platform = ?');
    return this.mapRowsToTracks(stmt.all(platform));
  }

  getTracksByStatus(status: DownloadStatus): Track[] {
    const stmt = this.db.prepare('SELECT * FROM tracks WHERE status = ?');
    return this.mapRowsToTracks(stmt.all(status));
  }

  getAllTracks(): Track[] {
    const stmt = this.db.prepare('SELECT * FROM tracks ORDER BY created_at DESC');
    return this.mapRowsToTracks(stmt.all());
  }

  trackExists(sourcePlatform: StreamingPlatform, platformId: string): boolean {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM tracks WHERE source_platform = ? AND platform_id = ?');
    const result = stmt.get(sourcePlatform, platformId) as { count: number };
    return result.count > 0;
  }

  // Sync session operations
  createSyncSession(): string {
    const id = this.generateId();
    const stmt = this.db.prepare(`
      INSERT INTO sync_sessions (id, started_at, status)
      VALUES (?, ?, 'running')
    `);
    stmt.run(id, Date.now());
    return id;
  }

  updateSyncSession(id: string, data: Partial<SyncSession>): void {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.completedAt) {
      updates.push('completed_at = ?');
      values.push(data.completedAt.getTime());
    }

    if (data.tracksDownloaded !== undefined) {
      updates.push('tracks_downloaded = ?');
      values.push(data.tracksDownloaded);
    }

    if (data.tracksSynced !== undefined) {
      updates.push('tracks_synced = ?');
      values.push(data.tracksSynced);
    }

    if (data.errors !== undefined) {
      updates.push('errors = ?');
      values.push(data.errors);
    }

    if (data.status) {
      updates.push('status = ?');
      values.push(data.status);
    }

    values.push(id);

    if (updates.length > 0) {
      const stmt = this.db.prepare(`
        UPDATE sync_sessions SET ${updates.join(', ')} WHERE id = ?
      `);
      stmt.run(...values);
    }
  }

  // Helper methods
  private mapRowsToTracks(rows: any[]): Track[] {
    return rows.map(row => ({
      id: row.id,
      sourcePlatform: row.source_platform as StreamingPlatform,
      downloadPlatform: row.download_platform as DownloadPlatform,
      title: row.title,
      artist: row.artist,
      platformId: row.platform_id,
      platformUrl: row.platform_url,
      downloadPath: row.download_path,
      status: row.status as DownloadStatus,
      mixType: row.mix_type,
      downloadedAt: row.downloaded_at ? new Date(row.downloaded_at) : undefined,
      syncedAt: row.synced_at ? new Date(row.synced_at) : undefined,
      fileSize: row.file_size,
      duration: row.duration,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  close(): void {
    this.db.close();
  }
}
