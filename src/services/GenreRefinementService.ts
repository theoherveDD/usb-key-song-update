/**
 * GenreRefinementService
 * 
 * Service pour améliorer la catégorisation des genres :
 * 1. Analyse les métadonnées des fichiers MP3
 * 2. Utilise l'API Beatport pour obtenir des genres plus précis
 * 3. Re-scanne et reclasse les fichiers du dossier "Other"
 */

import { readdirSync, statSync, renameSync, copyFileSync, unlinkSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';
import { config } from '../utils/config';
import { getGenreFolderPath, mapGenresToMainGenre, MainGenre } from '../utils/genreMapper';
import { SpotifyService } from './SpotifyService';
import { AppDatabase } from '../models/database';

const execAsync = promisify(exec);

interface FileMetadata {
  filePath: string;
  title?: string;
  artist?: string;
  genre?: string;
  bpm?: number;
  key?: string;
}

export class GenreRefinementService {
  private spotifyService: SpotifyService;

  constructor(private db: AppDatabase) {
    this.spotifyService = new SpotifyService();
  }

  /**
   * Re-scan et reclasse tous les fichiers du dossier "Other"
   */
  async reclassifyOtherFolder(): Promise<{
    totalScanned: number;
    reclassified: number;
    failed: number;
    details: Array<{ file: string; oldGenre: string; newGenre: string }>;
  }> {
    const basePath = config.paths.hardDrive || config.paths.downloadBase;
    const otherFolderPath = join(basePath, 'Other');

    logger.info('🔍 Starting reclassification scan of "Other" folder...');

    if (!existsSync(otherFolderPath)) {
      logger.warn('Other folder does not exist');
      return { totalScanned: 0, reclassified: 0, failed: 0, details: [] };
    }

    const results = {
      totalScanned: 0,
      reclassified: 0,
      failed: 0,
      details: [] as Array<{ file: string; oldGenre: string; newGenre: string }>
    };

    try {
      const files = readdirSync(otherFolderPath).filter(f => 
        ['.mp3', '.flac', '.wav', '.m4a'].includes(extname(f).toLowerCase())
      );

      results.totalScanned = files.length;
      logger.info(`📂 Found ${files.length} audio files in "Other" folder`);

      for (const file of files) {
        const filePath = join(otherFolderPath, file);
        
        try {
          // 1. Extraire les métadonnées du fichier
          const metadata = await this.extractFileMetadata(filePath);
          
          // 2. Rechercher le genre via Spotify
          let genres: string[] = [];
          if (metadata.artist && metadata.title) {
            genres = await this.searchGenresViaSpotify(metadata.artist, metadata.title);
          }

          // 3. Enrichir avec les genres depuis les tags ID3 si disponibles
          if (metadata.genre) {
            genres.push(metadata.genre);
          }

          // 4. Déterminer le nouveau genre
          const newGenre = mapGenresToMainGenre(genres);

          // 5. Si on trouve un genre plus spécifique que "Other", déplacer le fichier
          if (newGenre !== MainGenre.OTHER) {
            const newFolderPath = getGenreFolderPath(basePath, genres);
            const newFilePath = join(newFolderPath, file);

            // Créer le dossier si nécessaire
            if (!existsSync(newFolderPath)) {
              const { mkdirSync } = await import('fs');
              mkdirSync(newFolderPath, { recursive: true });
            }

            // Déplacer le fichier (copy + delete pour éviter les problèmes cross-device)
            try {
              copyFileSync(filePath, newFilePath);
              unlinkSync(filePath);
              
              logger.info(`✅ Reclassified: ${file} → ${newGenre}`);
              results.reclassified++;
              results.details.push({
                file: file,
                oldGenre: 'Other',
                newGenre: newGenre
              });

              // Mettre à jour la base de données
              await this.updateDatabasePath(file, newFilePath);

            } catch (moveError: any) {
              logger.error(`Failed to move file ${file}: ${moveError.message}`);
              results.failed++;
            }
          }

        } catch (error: any) {
          logger.error(`Error processing file ${file}: ${error.message}`);
          results.failed++;
        }

        // Petit délai pour éviter de surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger.info(`✅ Reclassification complete: ${results.reclassified}/${results.totalScanned} files moved`);
      return results;

    } catch (error: any) {
      logger.error('Error during reclassification scan', { error: error.message });
      throw error;
    }
  }

  /**
   * Extraire les métadonnées d'un fichier audio avec ffprobe
   */
  private async extractFileMetadata(filePath: string): Promise<FileMetadata> {
    try {
      // Utiliser ffprobe pour lire les métadonnées
      const command = `ffprobe -v quiet -print_format json -show_format "${filePath}"`;
      const { stdout } = await execAsync(command);
      
      const data = JSON.parse(stdout);
      const tags = data.format?.tags || {};

      return {
        filePath,
        title: tags.title || tags.TITLE,
        artist: tags.artist || tags.ARTIST || tags.album_artist || tags.ALBUM_ARTIST,
        genre: tags.genre || tags.GENRE,
        bpm: tags.bpm || tags.BPM ? parseInt(tags.bpm || tags.BPM) : undefined,
        key: tags.key || tags.KEY || tags.initial_key || tags.INITIAL_KEY
      };

    } catch (error: any) {
      // Si ffprobe échoue, essayer d'extraire depuis le nom de fichier
      logger.warn(`Could not extract metadata from ${basename(filePath)}, using filename`);
      return this.extractMetadataFromFilename(filePath);
    }
  }

  /**
   * Extraire les métadonnées depuis le nom de fichier
   * Format typique: "Artist - Title (Mix).mp3"
   */
  private extractMetadataFromFilename(filePath: string): FileMetadata {
    const filename = basename(filePath, extname(filePath));
    
    // Pattern: "Artist - Title" ou "Artist - Title (Mix)"
    const match = filename.match(/^(.+?)\s*-\s*(.+?)(?:\s*\(.*\))?$/);
    
    if (match) {
      return {
        filePath,
        artist: match[1].trim(),
        title: match[2].trim()
      };
    }

    return { filePath };
  }

  /**
   * Rechercher les genres via l'API Spotify
   */
  private async searchGenresViaSpotify(artist: string, title: string): Promise<string[]> {
    try {
      if (!this.spotifyService.isConfigured()) {
        return [];
      }

      const track = await this.spotifyService.searchTrack(artist, title);
      
      if (track && track.genres && track.genres.length > 0) {
        logger.info(`🎨 Found genres from Spotify: ${track.genres.join(', ')}`);
        return track.genres;
      }

      return [];
    } catch (error: any) {
      logger.warn(`Could not fetch genres from Spotify: ${error.message}`);
      return [];
    }
  }

  /**
   * Mettre à jour le chemin dans la base de données après déplacement
   */
  private async updateDatabasePath(filename: string, newPath: string): Promise<void> {
    try {
      // Récupérer tous les tracks et trouver celui avec ce nom de fichier
      const allTracks = this.db.getAllTracks();
      const track = allTracks.find(t => 
        t.downloadPath && basename(t.downloadPath) === filename
      );

      if (track) {
        this.db.updateTrackStatus(track.id, track.status, {
          downloadPath: newPath
        });
        logger.info(`📝 Updated database path for: ${filename}`);
      }
    } catch (error: any) {
      logger.warn(`Could not update database for ${filename}: ${error.message}`);
    }
  }

  /**
   * Scanner TOUS les dossiers de genres et essayer d'améliorer leur catégorisation
   */
  async reclassifyAllFolders(): Promise<{
    totalScanned: number;
    reclassified: number;
    failed: number;
  }> {
    const basePath = config.paths.hardDrive || config.paths.downloadBase;
    
    logger.info('🔍 Starting full library reclassification scan...');

    const results = {
      totalScanned: 0,
      reclassified: 0,
      failed: 0
    };

    try {
      // Scanner d'abord le dossier "Other" (prioritaire)
      const otherResults = await this.reclassifyOtherFolder();
      results.totalScanned += otherResults.totalScanned;
      results.reclassified += otherResults.reclassified;
      results.failed += otherResults.failed;

      // TODO: Scanner les autres dossiers pour affiner leur classification
      // (par exemple, déplacer des fichiers de "Techno" vers "Hard Techno" si approprié)

      logger.info(`✅ Full reclassification complete: ${results.reclassified}/${results.totalScanned} files reclassified`);
      return results;

    } catch (error: any) {
      logger.error('Error during full reclassification', { error: error.message });
      throw error;
    }
  }

  /**
   * Vérifier et enrichir les genres d'un fichier spécifique
   */
  async enrichFileGenre(filePath: string): Promise<string[]> {
    try {
      // 1. Extraire métadonnées
      const metadata = await this.extractFileMetadata(filePath);
      
      // 2. Rechercher sur Spotify
      const genres: string[] = [];
      if (metadata.artist && metadata.title) {
        const spotifyGenres = await this.searchGenresViaSpotify(metadata.artist, metadata.title);
        genres.push(...spotifyGenres);
      }

      // 3. Ajouter le genre du tag ID3 si disponible
      if (metadata.genre) {
        genres.push(metadata.genre);
      }

      return [...new Set(genres)]; // Dédupliquer

    } catch (error: any) {
      logger.error(`Failed to enrich genre for ${basename(filePath)}`, { error: error.message });
      return [];
    }
  }
}
