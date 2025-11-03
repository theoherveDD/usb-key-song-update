# 🔐 Guide OAuth 2.0 - Connexion Simplifiée

## 🎯 Nouvelle Méthode Simplifiée

L'authentification OAuth 2.0 vous permet maintenant de connecter vos services de streaming **en un seul clic**, sans manipulation manuelle de tokens !

## 🚀 Configuration Rapide (5 minutes)

### Étape 1 : Créer une application Spotify

1. Rendez-vous sur https://developer.spotify.com/dashboard
2. Cliquez sur **"Create app"**
3. Remplissez les informations :
   - **App name** : `USB Key Song Update`
   - **App description** : `DJ music library management`
   - **Redirect URI** : `http://localhost:3000/api/spotify/callback` ⚠️ **IMPORTANT**
   - **API/SDKs** : Cochez "Web API"
4. Acceptez les conditions et créez l'app
5. Notez votre **Client ID** et **Client Secret**

### Étape 2 : Configurer l'Application

Deux méthodes au choix :

#### 🅰️ Méthode 1 : Via l'interface web (recommandé)

1. Lancez l'application : `npm start`
2. Ouvrez http://localhost:3000/settings
3. Dans la section **"Spotify API"**, remplissez :
   - **Client ID** : Collez votre Client ID
   - **Client Secret** : Collez votre Client Secret
4. Cliquez sur **"Save Configuration"**

#### 🅱️ Méthode 2 : Via le fichier .env

Modifiez votre fichier `.env` :

```bash
SPOTIFY_CLIENT_ID=votre_client_id_ici
SPOTIFY_CLIENT_SECRET=votre_client_secret_ici
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
```

### Étape 3 : Connecter Spotify (1 clic !)

1. Ouvrez http://localhost:3000/connect
2. Cliquez sur le bouton **"Connect Spotify"** 🟢
3. Autorisez l'application dans la fenêtre Spotify qui s'ouvre
4. Vous serez automatiquement redirigé - **C'est tout ! ✅**

## 🎉 Avantages de OAuth 2.0

- ✅ **Un seul clic** pour connecter votre compte
- ✅ **Sécurisé** : Vos identifiants Spotify ne sont jamais exposés
- ✅ **Automatique** : Les tokens sont rafraîchis automatiquement
- ✅ **Révocable** : Déconnectez à tout moment en un clic
- ✅ **Pas de manipulation manuelle** de tokens ou de curl

## 📋 Permissions Demandées

L'application demande l'accès à :

- ✔️ **user-library-read** : Lire vos morceaux likés
- ✔️ **user-follow-read** : Lire vos artistes suivis
- ✔️ **user-read-recently-played** : Voir votre historique d'écoute
- ✔️ **playlist-read-private** : Accéder à vos playlists privées

💡 **Note** : Ces permissions permettent uniquement de **lire** vos données, jamais de les modifier.

## 🔧 Gestion des Connexions

### Vérifier le statut

Rendez-vous sur http://localhost:3000/connect pour voir l'état de toutes vos connexions.

### Déconnecter un service

1. Allez sur http://localhost:3000/connect
2. Cliquez sur **"Disconnect"** à côté du service
3. Confirmez la déconnexion

### Reconnecter

Cliquez simplement sur **"Connect"** à nouveau - l'ancien token sera remplacé.

## 🐛 Résolution de Problèmes

### Erreur "Invalid redirect URI"

➡️ **Solution** : Vérifiez que la Redirect URI dans votre app Spotify Dashboard est **exactement** :
```
http://localhost:3000/api/spotify/callback
```

### Erreur "Invalid client"

➡️ **Solution** : Vérifiez que votre Client ID et Client Secret sont corrects dans Settings.

### La connexion ne fonctionne pas

1. Vérifiez que l'app est démarrée : `npm start`
2. Vérifiez la console pour les erreurs
3. Vérifiez les logs dans `logs/app.log`

### Révoquer l'accès manuellement

Si vous souhaitez révoquer l'accès à Spotify :
1. Allez sur https://www.spotify.com/account/apps/
2. Trouvez "USB Key Song Update"
3. Cliquez sur "Remove Access"

## 🔄 Migration depuis l'Ancienne Méthode

Si vous utilisiez l'ancienne méthode avec curl :

1. **Supprimez** votre ancien `SPOTIFY_REFRESH_TOKEN` du .env (optionnel)
2. Suivez simplement les **3 étapes ci-dessus**
3. Votre ancien token sera automatiquement remplacé

## 🔮 Services à Venir

- 🎵 **Tidal** : OAuth en cours d'implémentation
- 🔊 **SoundCloud** : Configuration via auth token (voir Settings)

## 📚 Documentation Technique

Pour les développeurs, voir :
- API Spotify OAuth : https://developer.spotify.com/documentation/web-api/concepts/authorization
- Code source : `src/services/SpotifyService.ts`
- Routes API : `src/routes/api.ts`

---

**Besoin d'aide ?** Consultez les logs dans `logs/app.log` ou créez une issue sur GitHub.
