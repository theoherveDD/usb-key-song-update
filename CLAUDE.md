# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

USB-KEY-SONG-UPDATE - An automated music library management system for DJs that synchronizes music from streaming services to USB drives with Rekordbox integration.

**Current Status**: Initial Node.js/TypeScript implementation with background daemon and web interface.

## Project Goals

### Primary Objective
Maintain an always up-to-date USB key for DJ performances through automated music collection management.

### Core Features

1. **Streaming Service Integration**
   - **SoundCloud**: Integration via [scdl](https://github.com/scdl-org/scdl) - Independent SoundCloud workflow
      - Download all **your liked tracks**
      - Download all **reposts from accounts you follow**
      - Downloads directly from SoundCloud (not via Beatport)
      - Operates independently from other streaming services
   - **Spotify + Beatport**: Integration via Spotify API + [beatport-dl](https://github.com/dylanpdx/BetterBeatportDownloader)
      - Monitor Spotify likes, follows, and listening activity
      - Automatically search and download **extended/original mixes** from Beatport
      - Prioritize DJ-friendly versions (extended mixes, club versions, original mixes)
   - **Tidal + Beatport**: Integration via Tidal API + [beatport-dl](https://github.com/dylanpdx/BetterBeatportDownloader)
      - Monitor Tidal likes and favorites
      - Automatically search and download **extended/original mixes** from Beatport
      - Prioritize DJ-friendly versions (extended mixes, club versions, original mixes)
   - Automated detection and download of newly liked tracks across all platforms
   - **Download Strategy**:
      - scdl for SoundCloud (your likes + reposts from followed accounts) - **independent workflow, downloads from SoundCloud**
      - beatport-dl for Spotify-tracked preferences (extended versions from Beatport)
      - beatport-dl for Tidal-tracked preferences (extended versions from Beatport)
      - **NO Tidal-dl usage** - all Tidal and Spotify tracks are downloaded as extended versions from Beatport

2. **Automated Collection Management**
   - Continuous monitoring and downloading to a connected hard drive
   - Smart organization of downloaded music files
   - Metadata management and tagging

3. **Rekordbox Synchronization**
   - Automatic Rekordbox library export when USB drive is connected
   - Sync new tracks to USB key
   - Maintain Rekordbox database consistency across devices

4. **USB Drive Management**
   - Auto-detection of USB drive connection
   - Intelligent sync of only new/updated tracks
   - Maintain proper DJ-ready file structure

## Development Environment

- **Location**: `/Applications/MAMP/htdocs/USB-KEY-SONG-UPDATE`
- **Tech Stack**: Node.js + TypeScript
- **Platform**: Web interface with background daemon service
- **Database**: SQLite (better-sqlite3)
- **Package Manager**: npm

## Development Commands

### Initial Setup
```bash
# Install dependencies
npm install

# Copy environment template and configure
cp .env.example .env
# Edit .env with your paths and credentials

# Create required directories
mkdir -p data logs
```

### Development
```bash
# Run web interface in development mode (with auto-reload)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run production web server
npm start

# Run background daemon (auto-download and sync)
npm run daemon
```

### Testing and Code Quality
```bash
# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Architecture Overview

### Core Components

1. **Background Daemon** (`src/daemon.ts`)
   - Monitors drive connections using `DriveMonitorService`
   - Automatically triggers downloads when hard drive connects
   - Automatically triggers sync when USB drive connects
   - Runs periodic checks via cron jobs

2. **Web Interface** (`src/index.ts`)
   - Express server on port 3000
   - Simple HTML dashboard for manual control
   - REST API for triggering operations and checking status

3. **Services Layer**
   - `DriveMonitorService`: Detects USB/hard drive connection/disconnection using chokidar
   - `DownloadService`: Executes scdl and beatport-dl commands to download new tracks
   - `SyncService`: Copies files to USB and manages Rekordbox export
   - `SpotifyService`: Monitors Spotify likes/follows to trigger Beatport downloads
   - `TidalService`: Monitors Tidal likes/favorites to trigger Beatport downloads

4. **Data Layer**
   - `AppDatabase`: SQLite database wrapper with schema management
   - Tracks: Stores metadata for all downloaded songs
   - SyncSessions: Logs each sync operation with statistics

### Directory Structure
```
src/
├── daemon.ts              # Background service entry point
├── index.ts               # Web server entry point
├── models/
│   └── database.ts        # Database schema and operations
├── services/
│   ├── DriveMonitorService.ts    # Drive detection
│   ├── DownloadService.ts        # Platform downloaders (scdl + beatport-dl)
│   ├── SpotifyService.ts         # Spotify API integration
│   ├── TidalService.ts           # Tidal API integration
│   └── SyncService.ts            # USB sync logic
├── routes/
│   └── api.ts             # REST API endpoints
├── types/
│   └── index.ts           # TypeScript type definitions
└── utils/
    ├── config.ts          # Configuration management
    └── logger.ts          # Winston logger setup
```

### Data Flow

1. **Hard Drive Connected**
   → DriveMonitorService detects
   → DownloadService executes platform-specific commands:
   - **SoundCloud**: scdl (your likes + reposts from follows) → downloads from SoundCloud
   - **Spotify**: SpotifyService monitors likes → beatport-dl downloads extended versions from Beatport
   - **Tidal**: TidalService monitors likes → beatport-dl downloads extended versions from Beatport
     → New files saved to organized directories
     → Database updated with track metadata

2. **USB Drive Connected**
   → DriveMonitorService detects
   → SyncService queries database for unsynced tracks
   → Files copied to USB drive
   → Rekordbox export triggered
   → Database updated with sync status

## Technical Approach

The system will need to handle:
- File system monitoring (when USB/hard drive is connected)
- Spotify API integration to track user preferences (likes, follows, listening history)
- Tidal API integration to track user preferences (likes, favorites)
- Smart track matching: Spotify/Tidal track info → Beatport extended version search
- API integration with streaming services via third-party download tools
- Database for tracking downloaded songs and sync status
- Rekordbox XML/database interaction
- Automated workflow triggers

**Key Innovation**: Using Spotify and Tidal as "music discovery engines" to identify tracks, then downloading superior DJ-quality extended versions from Beatport instead of streaming-quality versions. SoundCloud operates independently and downloads directly from the platform.

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/status` - Get drive status and download statistics
- `POST /api/download` - Manually trigger download process
- `POST /api/sync` - Manually trigger USB sync
- `GET /api/tracks` - List tracks (filter by platform/status)
- `POST /api/scan` - Scan download directory and index files
- `GET /api/spotify/liked` - Get Spotify liked tracks (for Beatport matching)
- `GET /api/tidal/liked` - Get Tidal liked tracks (for Beatport matching)

## Configuration

Edit `.env` file to configure:

- **Paths**: Hard drive mount point, USB mount point, download directories
- **Tools**: Paths to scdl and beatport-dl executables (NO tidal-dl)
- **API Keys**: Spotify API credentials, Tidal API credentials, Beatport account
- **Monitoring**: Check interval, auto-sync enabled/disabled
- **Logging**: Log level and file location

Key paths to configure:
- `HARD_DRIVE_PATH`: Where your music hard drive mounts (e.g., `/Volumes/MusicDrive`)
- `USB_DRIVE_PATH`: Where your DJ USB key mounts (e.g., `/Volumes/DJ_USB`)
- `DOWNLOAD_BASE_PATH`: Root directory for downloaded music
- `REKORDBOX_DB_PATH`: Rekordbox installation/library path
- `SPOTIFY_CLIENT_ID`: Spotify API client ID
- `SPOTIFY_CLIENT_SECRET`: Spotify API client secret
- `TIDAL_CLIENT_ID`: Tidal API client ID (if available)
- `TIDAL_CLIENT_SECRET`: Tidal API client secret (if available)
- `BEATPORT_USERNAME`: Beatport account username
- `BEATPORT_PASSWORD`: Beatport account password

## Workflow Overview

1. **Download Phase**:
   - When hard drive is connected, monitor user's activity across all platforms:
      - **SoundCloud** (independent workflow):
         - Your liked tracks → downloaded via **scdl** → **from SoundCloud**
         - Reposts from accounts you follow → downloaded via **scdl** → **from SoundCloud**
      - **Spotify**: likes, follows, listening history → analyzed via **Spotify API** → extended versions downloaded **from Beatport** via **beatport-dl**
      - **Tidal**: likes and favorites → analyzed via **Tidal API** → extended versions downloaded **from Beatport** via **beatport-dl**
   - Smart matching: use Spotify and Tidal preferences to find and download extended/DJ versions from Beatport
   - Automatically download newly liked tracks and reposts using respective tools
   - Store tracks on hard drive with proper organization and metadata

2. **Sync Phase**:
   - When USB key is connected, detect the connection automatically
   - Trigger Rekordbox export process
   - Sync new/updated tracks to USB key
   - Update Rekordbox database on USB key

3. **Maintenance**:
   - Track download history to avoid duplicates
   - Manage storage space on both hard drive and USB key
   - Handle conflicts and updates
   - Cross-platform duplicate detection (same song on multiple platforms)

## External Dependencies

- [scdl-org/scdl](https://github.com/scdl-org/scdl) - SoundCloud downloader for your liked tracks and reposts from followed accounts (downloads from SoundCloud)
- [beatport-dl](https://github.com/dylanpdx/BetterBeatportDownloader) - Beatport downloader for extended/DJ mixes (used for both Spotify and Tidal tracked preferences)
- Spotify Web API - For tracking user likes, follows, and listening activity
- Tidal API - For tracking user likes and favorites
- Rekordbox (Pioneer DJ software)
- **NO Tidal-dl** - Not used in this project

## Git Configuration

- Main branch: main
- Text files use LF line endings (auto-detected via .gitattributes)

## Platform Download Implementation

Each platform uses a different approach:

### SoundCloud (scdl) → Downloads from SoundCloud
- **Your Likes**: `scdl -l https://soundcloud.com/you/likes --path <output> --onlymp3`
- **Reposts from Follows**: `scdl -l https://soundcloud.com/<username>/tracks --path <output> --onlymp3` (for each followed user)
- Downloads to: `{DOWNLOAD_BASE_PATH}/SoundCloud/`
- Requires: SoundCloud auth token in environment
- **Note**: Independent workflow - downloads directly from SoundCloud, not via Beatport

### Spotify → Beatport (beatport-dl) → Downloads from Beatport
- **Step 1**: Query Spotify API for liked tracks: `GET /v1/me/tracks`
- **Step 2**: For each liked track, search Beatport for extended version
- **Step 3**: Download via beatport-dl: `beatport-dl --url <beatport-track-url> --output <path>`
- Downloads to: `{DOWNLOAD_BASE_PATH}/Beatport/Spotify/`
- Requires:
   - Spotify API credentials configured
   - Beatport account credentials
- **Priority**: Extended Mix > Club Mix > Original Mix > Radio Edit

### Tidal → Beatport (beatport-dl) → Downloads from Beatport
- **Step 1**: Query Tidal API for liked/favorited tracks
- **Step 2**: For each liked track, search Beatport for extended version
- **Step 3**: Download via beatport-dl: `beatport-dl --url <beatport-track-url> --output <path>`
- Downloads to: `{DOWNLOAD_BASE_PATH}/Beatport/Tidal/`
- Requires:
   - Tidal API credentials configured
   - Beatport account credentials
- **Priority**: Extended Mix > Club Mix > Original Mix > Radio Edit

## Rekordbox Integration

The Rekordbox export is currently a placeholder in `SyncService.exportRekordboxLibrary()`. Implementation options:

1. **macOS AppleScript**: Automate Rekordbox GUI (if running on macOS)
2. **Rekordbox CLI**: If Pioneer provides CLI tools
3. **Direct Database Access**: Manipulate Rekordbox SQLite database
4. **XML Export**: Generate/update Rekordbox XML library files

Choose the approach based on your Rekordbox version and OS.

## Important Implementation Notes

### Database Schema
- Tracks table stores all downloaded music with platform, status, paths
- `platform_id` ensures uniqueness per platform (no duplicate downloads)
- Status flow: `pending` → `downloading` → `completed` → `synced`
- Sync sessions log each USB sync operation with statistics
- **Required fields**:
   - `source_platform` (e.g., "spotify", "tidal", "soundcloud")
   - `download_platform` (e.g., "beatport", "soundcloud")
   - `mix_type` (e.g., "Extended Mix", "Original Mix", null for SoundCloud)

### File Organization
Music is organized by download source:
```
{DOWNLOAD_BASE_PATH}/
├── SoundCloud/              # Your likes + reposts from follows (downloaded from SoundCloud)
└── Beatport/
    ├── Spotify/             # Extended versions tracked via Spotify (downloaded from Beatport)
    └── Tidal/               # Extended versions tracked via Tidal (downloaded from Beatport)
```

USB sync copies to:
```
{USB_DRIVE_PATH}/Music/
```

### Logging
All operations logged to:
- `logs/app.log` - All levels
- `logs/error.log` - Errors only
- Console output with colors (development)

## Development Workflow

1. **First Time Setup**
   - Install Node.js (v18+)
   - Install scdl and beatport-dl globally (NO tidal-dl needed)
   - Configure credentials for all platforms (SoundCloud, Spotify, Tidal, Beatport)
   - Copy `.env.example` to `.env` and configure paths
   - Run `npm install`

2. **Running in Development**
   - Terminal 1: `npm run dev` (web interface)
   - Terminal 2: `npm run daemon` (background service)
   - Access dashboard at `http://localhost:3000`

3. **Production Deployment**
   - Build: `npm run build`
   - Use process manager (PM2, systemd) to run daemon
   - Optional: Set up web server as systemd service
   - Configure to start on boot

## TODO Items

Areas marked for future implementation:

1. **TidalService.ts**: Create new service to monitor Tidal API and trigger Beatport downloads
2. **SpotifyService.ts**: Enhance service to monitor Spotify API and trigger Beatport downloads
3. **DownloadService.ts**:
   - Implement beatport-dl integration for both Spotify and Tidal sources
   - Add SoundCloud reposts download logic
   - Parse CLI tool output to track individual files in database
4. **SyncService.ts**: Implement actual Rekordbox export automation
5. **Database**:
   - Add `source_platform`, `download_platform`, and `mix_type` fields
   - Add file indexing when scanning directories
6. **API**:
   - Add Spotify OAuth flow for API access
   - Add Tidal OAuth flow for API access
   - Add authentication for web interface
7. **Spotify/Tidal → Beatport Matching**: Implement smart matching algorithm (artist + title → Beatport search)
8. **Testing**: Write unit tests for services
9. **Error Handling**: Implement retry logic for failed downloads
10. **Duplicate Detection**:
- Cross-platform duplicate detection logic
- Prevent downloading same track from multiple sources (e.g., same track liked on both Spotify and Tidal)