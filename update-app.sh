#!/bin/bash

# 🔄 Script de Mise à Jour Rapide sur le Serveur OVH
# À copier sur le serveur : ~/update-app.sh

set -e

echo "🔄 Mise à jour de l'application..."
echo ""

APP_DIR=~/www/usb-key-song-update
APP_NAME="usb-key-song-update"

# Vérifier que le répertoire existe
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Erreur: Le répertoire $APP_DIR n'existe pas"
    exit 1
fi

cd $APP_DIR

# 1. Pull depuis GitHub
echo "📥 Récupération des dernières modifications..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du git pull"
    exit 1
fi

# 2. Installer les dépendances
echo "📦 Installation des dépendances..."
npm install --production

# 3. Build
echo "🔨 Build de l'application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build"
    exit 1
fi

# 4. Redémarrer l'application
echo "🔄 Redémarrage de l'application..."
pm2 restart $APP_NAME

if [ $? -ne 0 ]; then
    echo "⚠️  PM2 non trouvé ou app non démarrée, tentative de démarrage..."
    pm2 start dist/index.js --name $APP_NAME --env production
fi

# 5. Sauvegarder la config PM2
pm2 save

echo ""
echo "✅ Mise à jour terminée avec succès !"
echo ""
echo "📊 Statut de l'application:"
pm2 status $APP_NAME

echo ""
echo "📝 Pour voir les logs:"
echo "   pm2 logs $APP_NAME"
