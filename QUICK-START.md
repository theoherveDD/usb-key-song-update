# 🎉 Guide de Démarrage Rapide - OAuth 2.0

## 🚀 Démarrage en 3 Minutes

### Étape 1 : Préparer votre Application Spotify (2 min)

1. Allez sur https://developer.spotify.com/dashboard
2. Cliquez sur **"Create app"**
3. Remplissez :
   - **App name** : `USB Key Song Update`
   - **Redirect URI** : `http://localhost:3000/api/spotify/callback`
   - Cochez **"Web API"**
4. Sauvegardez et notez votre **Client ID** et **Client Secret**

### Étape 2 : Configurer l'Application (30 sec)

```bash
# Démarrer l'app
./start.sh
# Ou : npm start
```

Ouvrez http://localhost:3000/settings et entrez :
- ✏️ **Spotify Client ID**
- ✏️ **Spotify Client Secret**
- Cliquez **"Save Configuration"**

### Étape 3 : Se Connecter (30 sec)

1. Allez sur http://localhost:3000/connect
2. Cliquez sur **"Connect Spotify"** 🟢
3. Autorisez l'application
4. ✅ **Terminé !**

---

## 📱 Interface Principale

### 🏠 Dashboard (`http://localhost:3000`)
- Vue d'ensemble des disques connectés
- Statistiques de téléchargement
- Actions rapides (Download / Sync / Scan)

### 🔌 Connect (`http://localhost:3000/connect`)
- Connexion en un clic à Spotify
- Statut en temps réel
- Déconnexion facile

### ⚙️ Settings (`http://localhost:3000/settings`)
- Configuration des chemins
- Identifiants des services
- Options de monitoring

---

## 🎯 Utilisation Quotidienne

### Télécharger de Nouveaux Morceaux

**Automatique** :
- Le daemon vérifie toutes les 30 minutes
- Télécharge automatiquement les nouvelles pistes likées

**Manuel** :
- Dashboard → Cliquez **"Download New Tracks"**

### Synchroniser vers la Clé USB

**Automatique** :
- Branchez votre clé USB
- La synchro démarre automatiquement

**Manuel** :
- Dashboard → Cliquez **"Sync to USB"**

---

## 🔧 Commandes Utiles

```bash
# Démarrer l'interface web
npm start

# Démarrer en mode développement (auto-reload)
npm run dev

# Démarrer le daemon (monitoring automatique)
npm run daemon

# Compiler TypeScript
npm run build

# Script tout-en-un (recommandé pour débuter)
./start.sh
```

---

## 🐛 Dépannage Rapide

### "Invalid redirect URI"
➡️ Vérifiez que dans Spotify Dashboard, la Redirect URI est :
```
http://localhost:3000/api/spotify/callback
```

### "Invalid client"
➡️ Vérifiez Client ID et Secret dans Settings

### La connexion ne fonctionne pas
1. Vérifiez que l'app est lancée : `npm start`
2. Regardez les logs : `tail -f logs/app.log`
3. Vérifiez la console du navigateur (F12)

### "Drive not connected"
➡️ Branchez votre disque dur ou clé USB et attendez quelques secondes

---

## 📚 Documentation Complète

- **[OAUTH-SETUP.md](./OAUTH-SETUP.md)** - Guide détaillé OAuth 2.0
- **[CHANGELOG-OAUTH.md](./CHANGELOG-OAUTH.md)** - Détails techniques des changements
- **[UI-PREVIEW.md](./UI-PREVIEW.md)** - Aperçu de l'interface
- **[CLAUDE.md](./CLAUDE.md)** - Architecture et API complète

---

## ✨ Fonctionnalités

- ✅ Connexion OAuth 2.0 en un clic
- ✅ Synchronisation automatique des pistes likées
- ✅ Monitoring des disques dur/USB
- ✅ Interface web moderne et intuitive
- ✅ Base de données SQLite pour tracking
- ✅ Logs détaillés pour debugging
- ✅ Support Spotify (Tidal et SoundCloud à venir)

---

## 🔐 Sécurité & Confidentialité

- 🔒 Vos identifiants sont stockés localement
- 🔒 Jamais partagés avec des tiers
- 🔒 Token refresh automatique et sécurisé
- 🔒 Révocation possible à tout moment
- 🔒 Conformité OAuth 2.0 standard

---

## 💡 Astuces Pro

### Vérifier le Statut
```bash
curl http://localhost:3000/api/status
```

### Voir vos Pistes Likées
```bash
curl http://localhost:3000/api/spotify/liked
```

### Vérifier la Connexion Spotify
```bash
curl http://localhost:3000/api/spotify/status
```

### Déconnecter via API
```bash
curl -X POST http://localhost:3000/api/spotify/disconnect
```

---

## 🎵 Workflow Typique

```
1. ❤️  Liker des morceaux sur Spotify
         ↓
2. 🤖 Le daemon détecte les nouveaux likes
         ↓
3. 🔍 Recherche les versions extended sur Beatport
         ↓
4. ⬇️  Télécharge vers le disque dur
         ↓
5. 💾 Synchro automatique vers la clé USB
         ↓
6. 🎧 Prêt pour le DJ set !
```

---

## 📞 Besoin d'Aide ?

- 📖 Consultez la documentation dans `/docs`
- 📝 Vérifiez les logs : `logs/app.log`
- 🐛 Créez une issue sur GitHub
- 💬 Rejoignez notre Discord (si disponible)

---

**Développé avec ❤️ pour les DJs par des DJs**

🎧 Happy Mixing ! 🎧
