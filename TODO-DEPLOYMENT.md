# 🎯 ÉTAPES SUIVANTES - Déploiement sur theoherve.fr

## ✅ Ce qui est Prêt

- ✅ Code committé dans Git
- ✅ Scripts de déploiement créés
- ✅ Documentation complète
- ✅ Configuration production préparée

## 📝 À FAIRE MAINTENANT (dans l'ordre)

### 1. Créer le Dépôt GitHub (5 minutes)

#### Option A : Via GitHub Desktop (plus simple)
1. Téléchargez GitHub Desktop : https://desktop.github.com/
2. Ouvrez-le et connectez votre compte GitHub
3. File → Add Local Repository → Sélectionnez `/Applications/MAMP/htdocs/USB-KEY-SONG-UPDATE`
4. Cliquez "Publish repository"
5. Nom : `usb-key-song-update`
6. Décochez "Keep this code private" (ou laissez coché si vous voulez)
7. Cliquez "Publish Repository"

#### Option B : En ligne de commande
```bash
# 1. Créez un nouveau repo sur https://github.com/new
#    Nom : usb-key-song-update
#    NE PAS initialiser avec README (on a déjà un projet)

# 2. Puis dans le terminal :
git remote add origin https://github.com/VOTRE_USERNAME/usb-key-song-update.git
git branch -M main
git push -u origin main
```

### 2. Préparer le Serveur OVH (10 minutes)

```bash
# Se connecter
ssh theohet@ftp.cluster100.hosting.ovh.net
# Mot de passe : Sirigu07070407
```

#### Une fois connecté, exécutez :

```bash
# Vérifier Node.js
node --version  # Si < 18, suivez les instructions ci-dessous

# Installer Node.js 18 si nécessaire
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
nvm alias default 18

# Installer PM2
npm install -g pm2

# Créer les dossiers
mkdir -p ~/www ~/logs ~/dj_music

# Cloner votre repository
cd ~/www
git clone https://github.com/VOTRE_USERNAME/usb-key-song-update.git
cd usb-key-song-update

# Installer les dépendances
npm install --production

# Build
npm run build

# Créer le fichier .env
cp .env.production.example .env.production
nano .env.production
# Modifiez :
# - SPOTIFY_REDIRECT_URI=https://theoherve.fr/api/spotify/callback
# - Les autres chemins si nécessaire
# Ctrl+X pour sauvegarder

# Créer les dossiers data et logs
mkdir -p data logs

# Démarrer l'application
pm2 start dist/index.js --name usb-key-song-update --env production

# Sauvegarder la config PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
# IMPORTANT : Copiez et exécutez la commande affichée

# Vérifier que ça tourne
pm2 status
curl http://localhost:3000/api/health
```

### 3. Configurer le Reverse Proxy (5 minutes)

#### Si vous utilisez cPanel (OVH)

1. Connectez-vous à votre cPanel
2. Allez dans "Application Manager" ou "Setup Node.js App"
3. Créez une nouvelle application Node.js :
   - **Node.js version** : 18
   - **Application mode** : Production
   - **Application root** : `www/usb-key-song-update`
   - **Application startup file** : `dist/index.js`
   - **Application URL** : `theoherve.fr` ou `/` (selon votre config)
   - **Port** : 3000

#### Si vous avez accès SSH et Apache

Créez `~/www/.htaccess` :

```bash
cat > ~/www/.htaccess << 'EOF'
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
EOF
```

### 3. Mettre à Jour Spotify Developer (2 minutes)

1. Allez sur https://developer.spotify.com/dashboard
2. Ouvrez votre application
3. Cliquez "Edit Settings"
4. Dans "Redirect URIs", ajoutez :
   ```
   https://theoherve.fr/usb-key-song-update/api/spotify/callback
   ```
5. Cliquez "Save"

### 5. Tester l'Application (1 minute)

```bash
# Depuis votre navigateur
https://theoherve.fr/usb-key-song-update/

# Vous devriez voir la page d'accueil !
```

## ⚠️ IMPORTANT : Configuration du Sous-dossier

L'application est installée dans `/usb-key-song-update/` pour ne pas interférer avec votre portfolio principal.

### URLs de l'application :

- Dashboard : `https://theoherve.fr/usb-key-song-update/`
- Connect : `https://theoherve.fr/usb-key-song-update/connect`
- Settings : `https://theoherve.fr/usb-key-song-update/settings`
- API : `https://theoherve.fr/usb-key-song-update/api/health`

### SEO : No-Index

✅ L'application est configurée pour **ne pas être indexée** par les moteurs de recherche :
- Meta tag `<meta name="robots" content="noindex, nofollow">` sur toutes les pages
- Header HTTP `X-Robots-Tag: noindex, nofollow`
- `robots.txt` avec `Disallow: /`

## 🔄 Pour les Mises à Jour Futures

### Sur votre Mac :

```bash
# 1. Faites vos modifications
code /Applications/MAMP/htdocs/USB-KEY-SONG-UPDATE

# 2. Testez en local
npm start

# 3. Commit et push
git add .
git commit -m "feat: ma nouvelle fonctionnalité"
git push origin main
```

### Sur le Serveur :

**Méthode Automatique** :
```bash
ssh theohet@ftp.cluster100.hosting.ovh.net "cd ~/www/usb-key-song-update && ./update-app.sh"
```

**Méthode Manuelle** :
```bash
ssh theohet@ftp.cluster100.hosting.ovh.net
cd ~/www/usb-key-song-update
git pull
npm install --production
npm run build
pm2 restart usb-key-song-update
```

## 📊 Vérifier que Tout Fonctionne

```bash
# Sur le serveur
pm2 status
pm2 logs usb-key-song-update

# Depuis votre navigateur
https://theoherve.fr/usb-key-song-update/
https://theoherve.fr/usb-key-song-update/connect
https://theoherve.fr/usb-key-song-update/api/health
```

## 🔒 Configuration Apache/Nginx

### Si vous avez Apache

Créez `~/www/usb-key-song-update/.htaccess` (déjà fourni dans le projet) :

```apache
# Prevent search engine indexing
Header set X-Robots-Tag "noindex, nofollow"

# Proxy to Node.js
RewriteEngine On
RewriteBase /usb-key-song-update/

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

### Si vous avez Nginx

Ajoutez dans votre configuration Nginx :

```nginx
location /usb-key-song-update/ {
    proxy_pass http://localhost:3000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    
    # No-index headers
    add_header X-Robots-Tag "noindex, nofollow" always;
}
```

## 🐛 Problèmes Courants

### Port 3000 déjà utilisé
```bash
lsof -i:3000
# Puis tuez le processus ou changez de port dans .env.production
```

### PM2 n'est pas trouvé
```bash
npm install -g pm2
```

### L'application ne démarre pas
```bash
# Vérifiez les logs
pm2 logs usb-key-song-update --err

# Vérifiez le build
cd ~/www/usb-key-song-update
npm run build
```

### Git pull échoue
```bash
# Réinitialisez les modifications locales
git reset --hard
git pull
```

## 📞 Aide

Si vous avez des problèmes :

1. **Consultez les logs** :
   ```bash
   pm2 logs usb-key-song-update
   tail -f ~/www/usb-key-song-update/logs/app.log
   ```

2. **Vérifiez la doc** :
   - [DEPLOY-QUICK.md](./DEPLOY-QUICK.md) - Démarrage rapide
   - [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - Guide complet

3. **Testez en local d'abord** :
   ```bash
   npm run build
   npm start
   ```

### ✨ Une Fois Déployé

Vous pourrez :
- ✅ Accéder à l'app depuis `https://theoherve.fr/usb-key-song-update/`
- ✅ Connecter Spotify en 1 clic
- ✅ Gérer vos téléchargements
- ✅ Mettre à jour en 30 secondes avec `git push`
- ✅ Votre portfolio reste sur `https://theoherve.fr/`
- ✅ L'app n'est **pas indexée** par Google (no-index)

---

**🎉 Bonne chance pour le déploiement !**

*Temps estimé total : 20-30 minutes*
