#!/bin/bash

# 🚀 Script de Déploiement Automatique sur OVH
# Usage: ./deploy.sh

set -e  # Arrêt en cas d'erreur

echo "🚀 Déploiement sur theoherve.fr"
echo "=================================="
echo ""

# Variables
REMOTE_HOST="ftp.cluster100.hosting.ovh.net"
REMOTE_USER="theohet"
REMOTE_DIR="/www"  # Ajustez selon votre hébergement OVH
APP_NAME="usb-key-song-update"

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# 1. Tests et build
echo "📦 Build du projet..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build"
    exit 1
fi

echo "✅ Build réussi"
echo ""

# 2. Commit local
echo "💾 Commit des changements..."
git add .
git commit -m "Deploy: $(date +'%Y-%m-%d %H:%M:%S')" || echo "Aucun changement à committer"

# 3. Push vers GitHub (si configuré)
if git remote get-url origin > /dev/null 2>&1; then
    echo "📤 Push vers GitHub..."
    git push origin main || git push origin master
    echo "✅ Push GitHub réussi"
else
    echo "⚠️  Aucun remote Git configuré (ignoré)"
fi

echo ""

# 4. Créer l'archive pour le déploiement
echo "📦 Création de l'archive..."
tar -czf deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='logs' \
    --exclude='data/*.db' \
    --exclude='.env' \
    --exclude='deploy.tar.gz' \
    .

echo "✅ Archive créée: deploy.tar.gz"
echo ""

# 5. Upload via SFTP
echo "📤 Upload vers OVH..."
echo "⚠️  Vous devrez entrer le mot de passe SSH"
echo ""

# Créer le script SFTP
cat > /tmp/deploy_sftp.sh << 'EOF'
cd www
put deploy.tar.gz
bye
EOF

# Exécuter SFTP
sftp -b /tmp/deploy_sftp.sh ${REMOTE_USER}@${REMOTE_HOST}

# Nettoyer
rm /tmp/deploy_sftp.sh

echo "✅ Upload terminé"
echo ""

# 6. Instructions pour SSH
echo "🔧 Étapes suivantes (via SSH):"
echo ""
echo "Connectez-vous en SSH:"
echo "  ssh ${REMOTE_USER}@${REMOTE_HOST}"
echo ""
echo "Puis exécutez:"
echo "  cd www"
echo "  tar -xzf deploy.tar.gz"
echo "  npm install --production"
echo "  npm run build"
echo "  pm2 restart ${APP_NAME} || pm2 start dist/index.js --name ${APP_NAME}"
echo ""
echo "✅ Déploiement préparé avec succès!"
echo ""

# Nettoyer l'archive locale
rm deploy.tar.gz
