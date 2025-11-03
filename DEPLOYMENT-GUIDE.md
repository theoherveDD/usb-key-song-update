# 🚀 Guide de Déploiement sur theoherve.fr (OVH)

## 📋 Prérequis

- Accès SSH à votre hébergement OVH
- Node.js installé sur le serveur (v18+)
- PM2 pour la gestion du processus (optionnel mais recommandé)
- Git (pour les mises à jour futures)

## 🎯 Architecture de Déploiement

```
Local Machine (Mac)
    ↓ git push
GitHub Repository
    ↓ git pull / deploy script
OVH Server (theoherve.fr)
    → Node.js App running on PM2
```

## 📦 Étape 1 : Configurer GitHub (une fois)

### 1.1 Créer un dépôt GitHub

```bash
# Sur GitHub.com, créez un nouveau repository
# Nom suggéré : usb-key-song-update
# Puis localement :

git remote add origin https://github.com/VOTRE_USERNAME/usb-key-song-update.git
git branch -M main
git add .
git commit -m "Initial commit with OAuth 2.0"
git push -u origin main
```

### 1.2 Configurer le .gitignore

✅ Déjà configuré ! Le fichier `.gitignore` exclut :
- `node_modules/`
- `.env` (credentials)
- `logs/`
- `data/` (base de données)

## 🔧 Étape 2 : Préparer le Serveur OVH

### 2.1 Se connecter en SSH

```bash
ssh theohet@ftp.cluster100.hosting.ovh.net
```

Mot de passe : `Sirigu07070407`

### 2.2 Vérifier Node.js

```bash
node --version  # Doit être v18+
npm --version
```

Si Node.js n'est pas installé ou est trop ancien :

```bash
# Installer Node.js v18 LTS
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
nvm alias default 18
```

### 2.3 Installer PM2 (gestionnaire de processus)

```bash
npm install -g pm2

# Configurer PM2 pour démarrer au boot
pm2 startup
# Suivez les instructions affichées
```

### 2.4 Créer les répertoires

```bash
# Créer la structure de dossiers
mkdir -p ~/www
mkdir -p ~/dj_music
mkdir -p ~/music_drive
mkdir -p ~/usb_drive
mkdir -p ~/logs
```

## 🚀 Étape 3 : Déploiement Initial

### Méthode A : Via le Script Automatique (Recommandé)

```bash
# Sur votre Mac
cd /Applications/MAMP/htdocs/USB-KEY-SONG-UPDATE
./deploy.sh
```

Le script va :
1. ✅ Builder le projet
2. ✅ Commit et push vers GitHub
3. ✅ Créer une archive
4. ✅ Uploader vers OVH via SFTP

Puis connectez-vous en SSH et exécutez :

```bash
ssh theohet@ftp.cluster100.hosting.ovh.net

cd ~/www
tar -xzf deploy.tar.gz
npm install --production
npm run build

# Démarrer avec PM2
pm2 start dist/index.js --name usb-key-song-update
pm2 save
```

### Méthode B : Via Git (Plus propre)

```bash
# Sur le serveur OVH (en SSH)
cd ~/www

# Cloner le repository
git clone https://github.com/VOTRE_USERNAME/usb-key-song-update.git
cd usb-key-song-update

# Installer les dépendances
npm install --production

# Créer le fichier .env
cp .env.production.example .env.production
nano .env.production  # Éditer avec vos valeurs

# Builder
npm run build

# Créer les dossiers nécessaires
mkdir -p data logs

# Démarrer avec PM2
pm2 start dist/index.js --name usb-key-song-update --env production
pm2 save
```

## 🔧 Étape 4 : Configuration Production

### 4.1 Configurer le Reverse Proxy

Si vous avez Apache ou Nginx sur OVH, configurez un reverse proxy :

#### Apache (.htaccess)

Créez `~/www/.htaccess` :

```apache
RewriteEngine On

# Redirect HTTP to HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Proxy vers Node.js
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

#### Nginx

Créez `/etc/nginx/sites-available/theoherve.fr` :

```nginx
server {
    listen 80;
    server_name theoherve.fr www.theoherve.fr;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activez le site :

```bash
sudo ln -s /etc/nginx/sites-available/theoherve.fr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.2 Configurer le Firewall

```bash
# Autoriser le port 3000 (si nécessaire)
sudo ufw allow 3000/tcp
```

### 4.3 Mettre à jour l'URL de Redirection Spotify

1. Allez sur https://developer.spotify.com/dashboard
2. Ouvrez votre app
3. Modifiez la Redirect URI :
   ```
   https://theoherve.fr/api/spotify/callback
   ```

### 4.4 Configurer les Variables d'Environnement

Sur le serveur, éditez `.env.production` :

```bash
cd ~/www/usb-key-song-update
nano .env.production
```

Mettez à jour :
- `SPOTIFY_REDIRECT_URI=https://theoherve.fr/api/spotify/callback`
- Les chemins locaux si nécessaire

Redémarrez l'app :

```bash
pm2 restart usb-key-song-update
```

## 🔄 Mises à Jour Rapides

### Méthode 1 : Via Git (Recommandé)

```bash
# Sur le serveur
cd ~/www/usb-key-song-update
git pull origin main
npm install --production
npm run build
pm2 restart usb-key-song-update
```

### Méthode 2 : Script de Déploiement Automatique

Créez `~/www/update.sh` sur le serveur :

```bash
#!/bin/bash
cd ~/www/usb-key-song-update
git pull origin main
npm install --production
npm run build
pm2 restart usb-key-song-update
echo "✅ Mise à jour terminée !"
```

Rendez-le exécutable :

```bash
chmod +x ~/www/update.sh
```

Pour mettre à jour :

```bash
# Depuis votre Mac
git push origin main

# Puis sur le serveur
ssh theohet@ftp.cluster100.hosting.ovh.net
~/www/update.sh
```

### Méthode 3 : Webhook GitHub (Avancé)

Créez un endpoint webhook pour déployer automatiquement à chaque push GitHub.

## 🛠️ Gestion de l'Application

### Commandes PM2 Utiles

```bash
# Voir le statut
pm2 status

# Voir les logs
pm2 logs usb-key-song-update

# Voir les logs en temps réel
pm2 logs usb-key-song-update --lines 100

# Redémarrer
pm2 restart usb-key-song-update

# Arrêter
pm2 stop usb-key-song-update

# Supprimer
pm2 delete usb-key-song-update

# Monitoring
pm2 monit

# Sauvegarder la configuration
pm2 save
```

### Vérifier que l'App Tourne

```bash
# Via PM2
pm2 status

# Via curl
curl http://localhost:3000/api/health

# Via navigateur
curl https://theoherve.fr/api/health
```

## 📊 Monitoring et Logs

### Voir les Logs

```bash
# Logs PM2
pm2 logs usb-key-song-update

# Logs applicatifs
tail -f ~/www/usb-key-song-update/logs/app.log

# Logs système
journalctl -u nginx -f  # Si Nginx
```

### Statistiques

```bash
# Utilisation des ressources
pm2 monit

# Détails de l'app
pm2 show usb-key-song-update
```

## 🔒 Sécurité

### 1. Protéger les Credentials

```bash
# Permissions restrictives sur .env
chmod 600 .env.production
```

### 2. Firewall

```bash
# N'autoriser que les ports nécessaires
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### 3. SSL/TLS (HTTPS)

Installez un certificat SSL gratuit avec Let's Encrypt :

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d theoherve.fr -d www.theoherve.fr
```

## 🐛 Dépannage

### L'App ne Démarre Pas

```bash
# Vérifier les logs
pm2 logs usb-key-song-update --err

# Vérifier le build
npm run build

# Vérifier Node.js
node --version
```

### Port 3000 Déjà Utilisé

```bash
# Trouver le processus
lsof -i:3000

# Tuer le processus
kill -9 PID
```

### Problèmes de Permissions

```bash
# Donner les bonnes permissions
chown -R theohet:theohet ~/www
chmod -R 755 ~/www
```

## 📱 Accès à l'Application

Une fois déployée, accédez à :

- **Production** : https://theoherve.fr
- **Dashboard** : https://theoherve.fr/
- **Connect** : https://theoherve.fr/connect
- **Settings** : https://theoherve.fr/settings
- **API Health** : https://theoherve.fr/api/health

## 🔄 Workflow de Développement

```bash
# 1. Développer en local
npm run dev

# 2. Tester
npm run build
npm start

# 3. Commit et push
git add .
git commit -m "Feature: nouvelle fonctionnalité"
git push origin main

# 4. Déployer sur le serveur
ssh theohet@ftp.cluster100.hosting.ovh.net
cd ~/www/usb-key-song-update
git pull
npm install --production
npm run build
pm2 restart usb-key-song-update
```

## 📞 Support

En cas de problème :

1. Vérifiez les logs : `pm2 logs`
2. Consultez la documentation OVH
3. Vérifiez la configuration Nginx/Apache
4. Testez localement d'abord

---

**🎉 Votre application est maintenant déployée sur theoherve.fr !**
