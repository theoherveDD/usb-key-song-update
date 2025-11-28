'use client';

import { useState, useEffect } from 'react';

type DownloadMode = 'playlist' | 'library' | null;

interface DownloadProgress {
  isDownloading: boolean;
  totalTracks: number;
  completedTracks: number;
  currentTrack: string;
  errors: number;
  scanProgress: {
    isScanning: boolean;
    likedTracksCount: number;
    playlistsScanned: number;
    totalPlaylists: number;
    currentPlaylist: string;
    playlistTracksCount: number;
  };
}

export default function SpotifyLikesPage() {
  const [selectedMode, setSelectedMode] = useState<DownloadMode>(null);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  // Poll for download progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isDownloading) {
      interval = setInterval(async () => {
        try {
          const response = await fetch('/api/download/progress');
          const data = await response.json();
          setProgress(data);

          // Stop polling when download is complete
          if (!data.isDownloading && !data.scanProgress.isScanning) {
            setIsDownloading(false);
            if (interval) clearInterval(interval);
          }
        } catch (error) {
          console.error('Error fetching progress:', error);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDownloading]);

  const handleDownloadPlaylist = async () => {
    if (!playlistUrl.trim()) {
      alert('Veuillez entrer un lien de playlist Spotify');
      return;
    }

    setIsDownloading(true);

    try {
      const response = await fetch('/api/spotify/download-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du telechargement');
      }

      alert('Telechargement lance!\n' + data.totalTracks + ' titres a telecharger.');
    } catch (error: any) {
      console.error('Error:', error);
      alert('Erreur: ' + error.message);
      setIsDownloading(false);
    }
  };

  const handleDownloadLibrary = async () => {
    if (!confirm('Voulez-vous telecharger TOUTE votre bibliotheque Spotify (titres likes + toutes les playlists) ?\n\nCela peut prendre beaucoup de temps selon la taille de votre bibliotheque.')) {
      return;
    }

    setIsDownloading(true);

    try {
      const response = await fetch('/api/spotify/download-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du telechargement');
      }

      alert('Telechargement de la bibliotheque lance!');
    } catch (error: any) {
      console.error('Error:', error);
      alert('Erreur: ' + error.message);
      setIsDownloading(false);
    }
  };

  const handleResetMode = () => {
    setSelectedMode(null);
    setPlaylistUrl('');
  };

  // Mode selection screen
  if (!selectedMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Telechargement Spotify
            </h1>
            <p className="text-xl text-gray-600">
              Choisissez ce que vous souhaitez telecharger
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Option 1: Telecharger une playlist */}
            <button
              onClick={() => setSelectedMode('playlist')}
              className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 p-8 text-left"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 opacity-10 rounded-bl-full transform group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="relative z-10">
                <div className="text-6xl mb-4">📋</div>
                <h2 className="text-3xl font-bold mb-3 text-gray-800">
                  Une Playlist
                </h2>
                <p className="text-gray-600 mb-4">
                  Telechargez tous les titres d&apos;une playlist Spotify specifique
                </p>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Rapide et cible
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Collez simplement le lien
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Parfait pour des sessions DJ
                  </li>
                </ul>
                <div className="mt-6 inline-flex items-center text-green-600 font-semibold group-hover:gap-3 gap-2 transition-all">
                  Continuer
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </button>

            {/* Option 2: Telecharger toute la bibliotheque */}
            <button
              onClick={() => setSelectedMode('library')}
              className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 p-8 text-left"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 opacity-10 rounded-bl-full transform group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="relative z-10">
                <div className="text-6xl mb-4">📚</div>
                <h2 className="text-3xl font-bold mb-3 text-gray-800">
                  Toute la Bibliotheque
                </h2>
                <p className="text-gray-600 mb-4">
                  Telechargez tous vos titres likes et toutes vos playlists
                </p>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-600">✓</span>
                    Synchronisation complete
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-600">✓</span>
                    Toutes les playlists incluses
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-600">✓</span>
                    Peut prendre du temps
                  </li>
                </ul>
                <div className="mt-6 inline-flex items-center text-blue-600 font-semibold group-hover:gap-3 gap-2 transition-all">
                  Continuer
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </button>
          </div>

          {/* Info box */}
          <div className="mt-12 p-6 bg-white rounded-xl shadow-md">
            <div className="flex items-start gap-4">
              <div className="text-3xl">💡</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Comment ca fonctionne ?</h3>
                <p className="text-gray-600">
                  Les titres seront telecharges depuis Beatport en version Extended Mix (DJ-friendly). 
                  Ils seront automatiquement organises par genre dans votre disque dur configure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Download screen with progress
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        {!isDownloading && (
          <button
            onClick={handleResetMode}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <span>←</span>
            <span>Retour au choix</span>
          </button>
        )}

        {/* Playlist Mode */}
        {selectedMode === 'playlist' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-3xl font-bold mb-2">Telecharger une Playlist</h2>
              <p className="text-gray-600">
                Collez le lien d&apos;une playlist Spotify ci-dessous
              </p>
            </div>

            {!isDownloading ? (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lien de la playlist Spotify
                  </label>
                  <input
                    type="text"
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    placeholder="https://open.spotify.com/playlist/..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                  />
                </div>

                <button
                  onClick={handleDownloadPlaylist}
                  disabled={!playlistUrl.trim()}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold text-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none"
                >
                  Lancer le telechargement
                </button>

                {/* Instructions */}
                <div className="mt-8 p-6 bg-blue-50 rounded-xl">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span>💡</span>
                    <span>Comment obtenir le lien ?</span>
                  </h3>
                  <ol className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-3">
                      <span className="font-semibold text-green-600 min-w-[24px]">1.</span>
                      <span>Ouvrez la playlist dans Spotify (app ou web)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-semibold text-green-600 min-w-[24px]">2.</span>
                      <span>Cliquez sur les trois points &quot;...&quot; (plus d&apos;options)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-semibold text-green-600 min-w-[24px]">3.</span>
                      <span>Selectionnez &quot;Partager&quot; puis &quot;Copier le lien de la playlist&quot;</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-semibold text-green-600 min-w-[24px]">4.</span>
                      <span>Collez le lien dans le champ ci-dessus</span>
                    </li>
                  </ol>
                </div>
              </>
            ) : (
              <DownloadProgressDisplay progress={progress} />
            )}
          </div>
        )}

        {/* Library Mode */}
        {selectedMode === 'library' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-3xl font-bold mb-2">Telecharger toute la Bibliotheque</h2>
              <p className="text-gray-600">
                Tous vos titres likes et toutes vos playlists
              </p>
            </div>

            {!isDownloading ? (
              <>
                <div className="mb-8 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">⚠️</div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Attention</h3>
                      <ul className="space-y-1 text-gray-700">
                        <li>• Cette operation peut prendre plusieurs heures</li>
                        <li>• Tous les titres seront telecharges depuis Beatport</li>
                        <li>• Les fichiers seront organises automatiquement par genre</li>
                        <li>• Assurez-vous d&apos;avoir suffisamment d&apos;espace disque</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDownloadLibrary}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold text-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Lancer le telechargement complet
                </button>
              </>
            ) : (
              <DownloadProgressDisplay progress={progress} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DownloadProgressDisplay({ progress }: { progress: DownloadProgress | null }) {
  if (!progress) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Initialisation...</p>
      </div>
    );
  }

  const { isDownloading, scanProgress } = progress;
  const downloadPercentage = progress.totalTracks > 0 
    ? (progress.completedTracks / progress.totalTracks) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Scan Progress */}
      {scanProgress.isScanning && (
        <div className="p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-blue-600"></div>
            <h3 className="font-bold text-xl">Analyse en cours...</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Titres likes</p>
              <p className="font-semibold text-lg">{scanProgress.likedTracksCount} trouves</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Playlists</p>
              <p className="font-semibold text-lg">
                {scanProgress.playlistsScanned} / {scanProgress.totalPlaylists} analysees
              </p>
              <p className="text-sm text-gray-500 mt-1">{scanProgress.currentPlaylist}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Titres dans les playlists</p>
              <p className="font-semibold text-lg">{scanProgress.playlistTracksCount} trouves</p>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress */}
      {!scanProgress.isScanning && isDownloading && (
        <div className="p-6 bg-green-50 rounded-xl border-2 border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="animate-pulse h-8 w-8 bg-green-600 rounded-full"></div>
            <h3 className="font-bold text-xl">Telechargement en cours...</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progression</span>
                <span>{progress.completedTracks} / {progress.totalTracks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: downloadPercentage + '%' }}
                ></div>
              </div>
              <p className="text-right text-sm font-semibold text-green-600 mt-1">
                {Math.round(downloadPercentage)}%
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Titre en cours</p>
              <p className="font-semibold">{progress.currentTrack}</p>
            </div>
            
            {progress.errors > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  {progress.errors} erreur(s) rencontree(s)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completion */}
      {!scanProgress.isScanning && !isDownloading && progress.totalTracks > 0 && (
        <div className="p-6 bg-green-100 rounded-xl border-2 border-green-300 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="font-bold text-2xl mb-2">Telechargement termine !</h3>
          <p className="text-gray-700">
            {progress.completedTracks} titres telecharges avec succes
          </p>
          {progress.errors > 0 && (
            <p className="text-red-600 mt-2">
              {progress.errors} titre(s) n&apos;ont pas pu etre telecharges
            </p>
          )}
        </div>
      )}
    </div>
  );
}
