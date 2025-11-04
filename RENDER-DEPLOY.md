# 🚀 Déploiement sur Render.com

## Étapes de déploiement

### 1. Créer un compte Render
- Va sur https://render.com
- Inscris-toi avec GitHub (recommandé)

### 2. Pousser le code sur GitHub
```bash
# Initialiser Git (si pas déjà fait)
git init

# Ajouter tous les fichiers
git add .

# Commit
git commit -m "Préparation déploiement Render"

# Créer un nouveau repo sur GitHub puis :
git remote add origin https://github.com/TON-USERNAME/usb-key-song-update.git
git branch -M main
git push -u origin main
```

### 3. Connecter Render à GitHub
- Sur Render Dashboard, clique "New +"
- Sélectionne "Web Service"
- Connecte ton repo GitHub
- Render détectera automatiquement `render.yaml`

### 4. Configurer les variables d'environnement
Dans Render, ajoute ces variables :
- `SPOTIFY_CLIENT_ID` : ton client ID Spotify
- `SPOTIFY_CLIENT_SECRET` : ton secret Spotify
- `TIDAL_CLIENT_ID` : ton client ID Tidal
- `TIDAL_CLIENT_SECRET` : ton secret Tidal

### 5. Mettre à jour les URLs de callback
**Spotify Dashboard :**
- Redirect URI : `https://TON-APP.onrender.com/api/spotify/callback`

**Tidal Dashboard :**
- Redirect URI : `https://TON-APP.onrender.com/api/tidal/callback`

### 6. Déployer !
Render va automatiquement :
- ✅ Installer les dépendances
- ✅ Compiler TypeScript
- ✅ Démarrer l'application
- ✅ Fournir une URL HTTPS gratuite

## 🌐 Ton app sera accessible à :
`https://usb-key-song-update.onrender.com`

## ⚠️ Note sur le plan gratuit
- L'app s'endort après 15 min d'inactivité
- Redémarre automatiquement à la première requête (délai de 30s)
- Suffisant pour un usage personnel

## 📊 Commandes utiles
- Voir les logs : depuis le dashboard Render
- Redémarrer : bouton "Manual Deploy" sur Render
- Mettre à jour : push sur GitHub, déploiement automatique
