# USB Key Song Update

An automated music library management system for DJs that synchronizes music from streaming services (SoundCloud, Tidal, Spotify) to USB drives with Rekordbox integration.

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your paths and credentials
   ```

3. **Connect streaming services** 🆕
   
   **NEW: One-Click OAuth 2.0!**
   - Add your Spotify Client ID & Secret in Settings
   - Click "Connect Spotify" - that's it! No manual token setup needed
   
   See [OAUTH-SETUP.md](./OAUTH-SETUP.md) for the simplified setup guide (5 minutes)
   
   <details>
   <summary>Or use the old manual method (not recommended)</summary>
   
   See [SPOTIFY-OAUTH-SETUP.md](./SPOTIFY-OAUTH-SETUP.md) for manual curl commands
   </details>

4. **Run in development**
   ```bash
   # Terminal 1: Web interface
   npm run dev

   # Terminal 2: Background daemon
   npm run daemon
   ```

5. **Access the dashboard**
   Open `http://localhost:3000` in your browser

## Features

- ✅ **One-Click OAuth 2.0** - Connect Spotify in seconds, no manual token setup
- Automatically downloads liked tracks from SoundCloud, Tidal, and Spotify
- Monitors drive connections and triggers downloads/syncs automatically
- Web interface for manual control and monitoring
- SQLite database tracks all downloads and sync operations
- Organized file structure by platform
- Rekordbox integration (placeholder - requires implementation)

## Interface

- 🏠 **Dashboard** (`/`) - Monitor drives, view stats, trigger actions
- 🔌 **Connect** (`/connect`) - One-click OAuth connection to streaming services
- ⚙️ **Settings** (`/settings`) - Configure paths, credentials, and preferences

## Prerequisites

- Node.js v18 or higher
- [scdl](https://github.com/scdl-org/scdl) - for SoundCloud downloads
- [Tidal-dl](https://github.com/yaronzz/Tidal-Media-Downloader) - for Tidal and Spotify downloads
- Configured credentials for all platforms

## Documentation

- [OAUTH-SETUP.md](./OAUTH-SETUP.md) - **NEW!** Simplified OAuth 2.0 setup guide (recommended)
- [SPOTIFY-OAUTH-SETUP.md](./SPOTIFY-OAUTH-SETUP.md) - Legacy manual setup (not recommended)
- [CLAUDE.md](./CLAUDE.md) - Detailed architecture, API documentation, and development guidelines

## License

ISC
