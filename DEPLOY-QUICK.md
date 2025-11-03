# ⚡ Déploiement Rapide - theoherve.fr

## 🎯 En 5 Minutes

### 1️⃣ Créer le Dépôt GitHub (1 min)

```bash
# Sur GitHub.com : Créer un nouveau repository "usb-key-song-update"

# Puis localement :
git remote add origin https://github.com/VOTRE_USERNAME/usb-key-song-update.git
git add .
git commit -m "Initial commit - OAuth 2.0 ready"
git push -u origin main
```

### 2️⃣ Préparer le Serveur OVH (2 min)

```bash
# Se connecter
ssh theohet@ftp.cluster100.hosting.ovh.net
# Mot de passe : Sirigu07070407

# Créer les dossiers
mkdir -p ~/www ~/logs

# Cloner le projet
cd ~/www
git clone https://github.com/VOTRE_USERNAME/usb-key-song-update.git
cd usb-key-song-update

# Installer
npm install --production
npm run build

# Créer .env
cp .env.production.example .env.production
nano .env.production  # Éditer SPOTIFY_REDIRECT_URI

# Démarrer
pm2 start dist/index.js --name usb-key-song-update
pm2 save
```

### 3️⃣ Configurer le Reverse Proxy (2 min)

Créez `~/www/.htaccess` :

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

### 4️⃣ Tester

```bash
# Sur le serveur
curl http://localhost:3000/api/health

# Depuis votre navigateur
https://theoherve.fr/
```

## 🔄 Mises à Jour (30 secondes)

```bash
# Sur votre Mac
git add .
git commit -m "Update"
git push origin main

# Sur le serveur
ssh theohet@ftp.cluster100.hosting.ovh.net
cd ~/www/usb-key-song-update
git pull
npm install --production
npm run build
pm2 restart usb-key-song-update
```

Ou utilisez le script :

```bash
ssh theohet@ftp.cluster100.hosting.ovh.net "cd ~/www/usb-key-song-update && ./update-app.sh"
```

## 🔧 Commandes Utiles

```bash
# Voir le statut
pm2 status

# Voir les logs
pm2 logs usb-key-song-update

# Redémarrer
pm2 restart usb-key-song-update

# Arrêter
pm2 stop usb-key-song-update
```

## 🌐 URLs

- Dashboard : https://theoherve.fr/usb-key-song-update/
- Connect : https://theoherve.fr/usb-key-song-update/connect  
- Settings : https://theoherve.fr/usb-key-song-update/settings
- API : https://theoherve.fr/usb-key-song-update/api/health

**Note** : L'app est dans `/usb-key-song-update/` pour ne pas interférer avec votre portfolio.

**SEO** : L'application n'est pas indexée par les moteurs de recherche (no-index configuré).

---

Pour la documentation complète, voir [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)
