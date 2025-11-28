# 📦 Guide d'installation - USB Key Song Update

Guide complet pour installer et configurer l'application de gestion musicale automatisée.

---

## 📋 Table des matières

- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Lancement de l'application](#-lancement-de-lapplication)
- [Configuration des outils de téléchargement](#-configuration-des-outils-de-téléchargement)
- [Utilisation](#-utilisation)
- [Dépannage](#-dépannage)

---

## 🔧 Prérequis

### Logiciels requis

1. **Node.js** (version 18 ou supérieure)
   ```bash
   # Vérifier l'installation
   node --version
   ```
   Téléchargement : https://nodejs.org/

2. **npm** (inclus avec Node.js)
   ```bash
   # Vérifier l'installation
   npm --version
   ```

3. **ngrok** (pour l'accès externe)
   ```bash
   # Installation via Homebrew (macOS)
   brew install ngrok
   
   # Vérifier l'installation
   ngrok version
   ```
   Alternative : https://ngrok.com/download

4. **beatport-dl** (pour télécharger depuis Beatport)
   ```bash
   # Installation
   pip install beatport-dl
   
   # Vérifier l'installation
   beatport-dl --version
   ```

5. **tidal-dl** (optionnel, pour télécharger depuis Tidal)
   ```bash
   # Installation
   pip install tidal-dl
   
   # Vérifier l'installation
   tidal-dl --version
   ```

### Comptes requis

- **Compte Spotify** (gratuit ou premium)
- **Beatport Account** (pour beatport-dl)
- **Tidal Account** (optionnel, pour tidal-dl)

---

## 📥 Installation

### 1. Cloner le repository

```bash
# Cloner le projet
git clone https://github.com/theoherveDD/usb-key-song-update.git

# Accéder au dossier
cd usb-key-song-update
```

### 2. Installer les dépendances

```bash
npm install
```

Cette commande installe toutes les dépendances nécessaires listées dans `package.json`.

### 3. Créer le fichier de configuration

```bash
# Copier le fichier d'exemple
cp .env.production.example .env

# Éditer le fichier
nano .env
# ou
code .env
```

---

## ⚙️ Configuration

### Configuration du fichier `.env`

Ouvrez le fichier `.env` et configurez les paramètres suivants :

```env
# Configuration de base
NODE_ENV=development
PORT=3000

# 📁 Chemins - À ADAPTER selon votre système
HARD_DRIVE_PATH=/Users/votre-nom/Music/DJ-Library
USB_DRIVE_PATH=/Volumes/USB-DJ
DOWNLOAD_BASE_PATH=/Users/votre-nom/Downloads/Music

# 🎵 Spotify OAuth
SPOTIFY_CLIENT_ID=votre_client_id_spotify
SPOTIFY_CLIENT_SECRET=votre_client_secret_spotify
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback/spotify

# 🎧 Beatport (pour beatport-dl)
BEATPORT_USERNAME=votre_email_beatport
BEATPORT_PASSWORD=votre_mot_de_passe_beatport

# 🌊 Tidal (optionnel)
TIDAL_CLIENT_ID=votre_client_id_tidal
TIDAL_CLIENT_SECRET=votre_client_secret_tidal

# 💾 Database
DB_PATH=./data/usb-key-song.db

# 📝 Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### Obtenir les credentials Spotify

1. **Aller sur le Dashboard Spotify**
   - Visitez : https://developer.spotify.com/dashboard
   - Connectez-vous avec votre compte Spotify

2. **Créer une application**
   - Cliquez sur "Create an App"
   - Nom : "USB Key Song Update"
   - Description : "Music library management"
   - Cochez "Web API"
   - Acceptez les conditions

3. **Récupérer les identifiants**
   - Cliquez sur "Settings"
   - Copiez le **Client ID**
   - Cliquez sur "Show Client Secret" et copiez le **Client Secret**

4. **Configurer l'URL de redirection**
   - Dans "Redirect URIs", ajoutez :
     ```
     http://localhost:3000/callback/spotify
     ```
   - Cliquez sur "Add" puis "Save"

5. **Mettre à jour `.env`**
   ```env
   SPOTIFY_CLIENT_ID=votre_client_id_copié
   SPOTIFY_CLIENT_SECRET=votre_client_secret_copié
   SPOTIFY_REDIRECT_URI=http://localhost:3000/callback/spotify
   ```

---

## 🚀 Lancement de l'application

### Méthode 1 : Script de démarrage automatique

Le plus simple :

```bash
chmod +x start.sh
./start.sh
```

Ce script lance automatiquement le serveur en mode développement.

### Méthode 2 : Commandes manuelles

#### Terminal 1 : Démarrer le serveur

```bash
npm run dev
```

Vous devriez voir :
```
🚀 Server running on http://localhost:3000
📊 API available at http://localhost:3000/api
```

#### Terminal 2 : Démarrer ngrok

Dans un **nouveau terminal** :

```bash
ngrok http 3000
```

Vous verrez quelque chose comme :
```
Session Status                online
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3000
```

**⚠️ IMPORTANT** : Copiez l'URL `https://abc123.ngrok-free.app` - c'est votre URL publique !

### Accéder à l'application

1. **En local** : http://localhost:3000
2. **Via ngrok** : https://votre-url.ngrok-free.app

---

## 🎧 Configuration des outils de téléchargement

### Configuration de beatport-dl

1. **Première connexion**
   ```bash
   beatport-dl
   ```

2. **Entrer vos identifiants Beatport**
   - Email : votre_email@example.com
   - Mot de passe : ********

3. **Tester la connexion**
   ```bash
   # Rechercher un titre pour tester
   beatport-dl
   > Rechercher: "martin garrix animals"
   ```

### Configuration de tidal-dl (optionnel)

1. **Lancer tidal-dl**
   ```bash
   tidal-dl
   ```

2. **Se connecter**
   - Suivez les instructions à l'écran
   - Authentifiez-vous avec votre compte Tidal

3. **Configuration recommandée**
   - Quality : Master (si abonnement HiFi)
   - Download path : laissez par défaut
   - Format : FLAC ou M4A

---

## 🎯 Utilisation

### 1. Première connexion Spotify

1. Ouvrez l'application dans votre navigateur
2. Cliquez sur "Connect Spotify"
3. Autorisez l'accès à votre compte
4. Vous serez redirigé vers l'application

### 2. Télécharger votre bibliothèque Spotify

```bash
# Via l'interface web
- Cliquez sur "Download All Spotify Library"

# Ou via API
curl -X POST http://localhost:3000/api/download/spotify/all
```

### 3. Télécharger une playlist spécifique

```bash
# Via l'interface web
- Collez l'URL de la playlist Spotify
- Cliquez sur "Download Playlist"

# Ou via API
curl -X POST http://localhost:3000/api/download/spotify/playlist \
  -H "Content-Type: application/json" \
  -d '{"playlistId": "37i9dQZF1DXcBWIGoYBM5M"}'
```

### 4. Monitoring des téléchargements

Allez sur : http://localhost:3000/api/download/progress

Vous verrez :
```json
{
  "isDownloading": true,
  "totalTracks": 150,
  "completedTracks": 45,
  "currentTrack": "Artist - Track Name",
  "errors": 2
}
```

---

## 📂 Structure des dossiers

L'application organise automatiquement vos téléchargements :

```
HARD_DRIVE_PATH/
├── Electronic/           # Musique électronique
├── House/                # House music
├── Techno/               # Techno
├── Hip-Hop/              # Hip-Hop
├── Pop/                  # Pop
├── Rock/                 # Rock
├── Other/                # Autres genres
└── Playlists/            # Téléchargements par playlist
    └── My Playlist/
```

---

## 🔍 Fonctionnalités clés

### 🎯 Recherche intelligente

L'application utilise un système de correspondance avancé :

1. **Priorisation des mix types**
   - Extended Mix (priorité 1)
   - Original Mix (priorité 2)
   - Radio Edit (priorité 3)

2. **Vérification de pertinence**
   - Similarité artiste/titre > 75% = téléchargement
   - Similarité 60-75% = warning + téléchargement
   - Similarité < 60% = skip vers Tidal
   - Similarité < 65% sur les deux = skip

3. **Double vérification**
   - Vérification avant téléchargement
   - Vérification après téléchargement du fichier

### 🔄 Système de fallback

```
Spotify → Beatport (Extended Mix prioritaire)
            ↓ (si échec ou non pertinent)
          Tidal (Radio Edit/Original)
            ↓ (si échec)
          Erreur signalée
```

---

## 🐛 Dépannage

### Le serveur ne démarre pas

```bash
# Vérifier que Node.js est installé
node --version

# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install

# Vérifier les ports
lsof -i :3000
```

### Erreur de connexion Spotify

1. Vérifiez que les credentials sont corrects dans `.env`
2. Vérifiez que l'URL de redirection est bien configurée sur le Dashboard Spotify
3. Essayez de vous reconnecter : http://localhost:3000/auth/spotify

### beatport-dl ne fonctionne pas

```bash
# Vérifier l'installation
beatport-dl --version

# Réinitialiser la configuration
rm -rf ~/.config/beatport-dl
beatport-dl  # Se reconnecter
```

### Erreur "No suitable match found"

- Le titre n'existe pas sur Beatport/Tidal
- L'orthographe est différente
- Vérifiez les logs : `./logs/app.log`

### ngrok session expired

```bash
# Relancer ngrok
ngrok http 3000

# Mettre à jour l'URL dans vos bookmarks
```

### Erreurs de permission

```bash
# Donner les permissions nécessaires
chmod -R 755 temp-downloads/
chmod 755 start.sh
```

---

## 📊 Endpoints API utiles

### Téléchargement

```bash
# Télécharger toute la bibliothèque Spotify
POST /api/download/spotify/all

# Télécharger une playlist
POST /api/download/spotify/playlist
Body: { "playlistId": "xxx" }

# Progression
GET /api/download/progress
```

### Spotify

```bash
# Authentification
GET /auth/spotify

# Liked tracks
GET /api/spotify/liked-tracks

# Playlists
GET /api/spotify/playlists
```

### Base de données

```bash
# Statistiques
GET /api/stats

# Tous les tracks
GET /api/tracks
```

---

## 🎓 Conseils d'utilisation

### 1. Première utilisation

- Testez avec une petite playlist (10-20 titres)
- Vérifiez que les téléchargements se font bien
- Vérifiez l'organisation dans les dossiers

### 2. Performances

- Les téléchargements sont séquentiels (1 par 1)
- Comptez ~30 secondes par titre
- 100 titres ≈ 50 minutes

### 3. Organisation

- Les genres sont détectés automatiquement
- Les playlists créent des dossiers dédiés
- Les doublons sont automatiquement détectés

### 4. Sécurité

- **Ne partagez jamais votre fichier `.env`**
- Ne commitez jamais vos credentials
- Utilisez `.gitignore` pour protéger `.env`

---

## 🆘 Support

### Logs

Les logs sont dans `./logs/app.log` :

```bash
# Voir les derniers logs
tail -f ./logs/app.log

# Chercher des erreurs
grep ERROR ./logs/app.log
```

### Issues GitHub

Ouvrez une issue sur : https://github.com/theoherveDD/usb-key-song-update/issues

Incluez :
- Version de Node.js
- Système d'exploitation
- Logs d'erreur
- Étapes pour reproduire

---

## 📝 Notes importantes

- ⚠️ **Droits d'auteur** : Assurez-vous d'avoir le droit de télécharger les titres
- 💾 **Espace disque** : Prévoyez suffisamment d'espace (FLAC = ~30-50 MB/titre)
- 🔐 **Sécurité** : Ne partagez jamais vos credentials
- 🎵 **Qualité** : Beatport = qualité DJ, Tidal = qualité streaming

---

## 🎉 Bon téléchargement !

Si vous avez des questions, n'hésitez pas à ouvrir une issue sur GitHub.

**Happy DJing! 🎧**
