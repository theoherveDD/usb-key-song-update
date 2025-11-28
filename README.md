# 🎵 USB Key Song Update

Application automatisée pour télécharger, organiser et synchroniser votre bibliothèque musicale DJ avec Spotify, Beatport et Tidal.

## ✨ Fonctionnalités principales

- 🎧 **Téléchargement automatique** depuis Spotify vers Beatport (Extended Mix prioritaire)
- 🔄 **Fallback intelligent** vers Tidal pour les titres commerciaux non disponibles sur Beatport
- 🎯 **Correspondance intelligente** avec vérification de pertinence avancée (similarité artiste/titre)
- 📁 **Organisation automatique** par genres musicaux (Electronic, House, Techno, Hip-Hop, etc.)
- 📋 **Support des playlists** avec dossiers dédiés
- 🚫 **Détection des doublons** pour éviter les téléchargements redondants
- 🎵 **Priorisation des mix types** : Extended Mix > Original Mix > Radio Edit
- 💾 **Base de données SQLite** pour le suivi des téléchargements
- 📊 **API REST complète** pour l'intégration et le monitoring

## 🚀 Démarrage rapide

### Installation complète

Consultez **[INSTALLATION.md](./INSTALLATION.md)** pour le guide complet d'installation et de configuration.

### Démarrage express (si déjà installé)

**Terminal 1 : Serveur**
```bash
./start.sh
# ou
npm run dev
```

**Terminal 2 : ngrok (accès externe)**
```bash
ngrok http 3000
```

**Accès à l'application**
- Local : http://localhost:3000
- Externe : https://votre-url.ngrok-free.app

## 📖 Documentation

- **[INSTALLATION.md](./INSTALLATION.md)** - Guide complet d'installation et configuration
  - Prérequis et logiciels requis
  - Configuration Spotify, Beatport, Tidal
  - Lancement avec npm et ngrok
  - Dépannage et support

## 🎯 Utilisation rapide

### 1. Connecter Spotify
```bash
# Ouvrir l'application et cliquer sur "Connect Spotify"
# Ou via URL directe :
http://localhost:3000/auth/spotify
```

### 2. Télécharger votre bibliothèque
```bash
# Via l'interface web ou via API :
curl -X POST http://localhost:3000/api/download/spotify/all
```

### 3. Télécharger une playlist
```bash
# Via l'interface web en collant l'URL Spotify
# Ou via API :
curl -X POST http://localhost:3000/api/download/spotify/playlist \
  -H "Content-Type: application/json" \
  -d '{"playlistId": "37i9dQZF1DXcBWIGoYBM5M"}'
```

### 4. Suivre la progression
```bash
# Voir la progression en temps réel :
http://localhost:3000/api/download/progress
```

## 🔍 Intelligence de téléchargement

### Système de fallback automatique

```
Recherche Spotify
      ↓
1. Recherche Beatport (priorité Extended Mix)
   - Vérification similarité > 75%
   - Si < 65% → Passe à Tidal
      ↓
2. Recherche Tidal (fallback)
   - Radio Edit / Original
   - Vérification similarité > 75%
   - Si < 65% → Skip avec erreur
      ↓
3. Téléchargement et vérification finale
```

### Priorisation des mix types

- **Extended Mix** (Priorité 1) - Idéal pour les DJ sets
- **Original Mix** (Priorité 2) - Version originale complète
- **Radio Edit** (Priorité 3) - Version radio courte

## 📂 Organisation automatique

```
HARD_DRIVE_PATH/
├── Electronic/           # Musique électronique
├── House/                # House music
├── Techno/               # Techno
├── Hip-Hop/              # Hip-Hop
├── Pop/                  # Pop
├── Rock/                 # Rock
├── Other/                # Genres non classés
└── Playlists/            # Téléchargements par playlist
    ├── My Summer Vibes/
    └── DJ Set 2024/
```

## 🛠️ Configuration requise

- **Node.js** 18+
- **npm** (inclus avec Node.js)
- **ngrok** (pour accès externe)
- **beatport-dl** (pip install beatport-dl)
- **tidal-dl** (optionnel - pip install tidal-dl)

### Comptes nécessaires

- Compte Spotify (gratuit ou premium)
- Compte Beatport (pour beatport-dl)
- Compte Tidal (optionnel, pour fallback)

## 🔌 API Endpoints

### Téléchargement
- `POST /api/download/spotify/all` - Télécharger toute la bibliothèque
- `POST /api/download/spotify/playlist` - Télécharger une playlist
- `GET /api/download/progress` - Voir la progression

### Spotify
- `GET /auth/spotify` - Authentification Spotify
- `GET /api/spotify/liked-tracks` - Liste des likes
- `GET /api/spotify/playlists` - Liste des playlists

### Base de données
- `GET /api/stats` - Statistiques générales
- `GET /api/tracks` - Liste des téléchargements

## 📊 Statistiques

- ⚡ ~30 secondes par titre
- 🎵 Détection automatique de +10 genres
- 🔍 Vérification de pertinence à 3 niveaux
- 💾 Tracking complet en base de données

## 🐛 Dépannage

Consultez [INSTALLATION.md](./INSTALLATION.md) section "Dépannage" pour :
- Problèmes de connexion Spotify
- Erreurs beatport-dl / tidal-dl
- Problèmes de permissions
- Logs et debugging

## 🤝 Contribution

Ce projet est partagé pour permettre à mes amis DJs de profiter d'une gestion musicale automatisée.

N'hésitez pas à :
- Ouvrir des issues pour des bugs ou suggestions
- Proposer des améliorations
- Partager vos retours d'expérience

## ⚠️ Avertissement

Cette application est destinée à un usage personnel. Assurez-vous d'avoir les droits nécessaires pour télécharger et utiliser le contenu musical.

## 📝 Licence

ISC

---

**Bon mix ! 🎧**

*Pour toute question, consultez [INSTALLATION.md](./INSTALLATION.md) ou ouvrez une issue.*
