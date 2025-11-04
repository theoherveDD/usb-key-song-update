#!/bin/bash

# Script d'installation sur le serveur OVH
# À exécuter UNE FOIS connecté en SSH sur le serveur

echo "🚀 Installation de l'application USB-KEY-SONG-UPDATE"
echo ""

# Aller dans le bon répertoire
cd ~/www/USB-KEY-SONG-UPDATE || exit 1

echo "📦 Installation des dépendances..."
npm install --production

echo "📁 Création des dossiers nécessaires..."
mkdir -p logs
mkdir -p data

echo "🔧 Vérification de PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installation de PM2..."
    npm install -g pm2
else
    echo "✅ PM2 déjà installé"
fi

echo "🛑 Arrêt de l'ancienne instance (si elle existe)..."
pm2 delete usb-key-song-update 2>/dev/null || true

echo "🚀 Démarrage de l'application..."
pm2 start dist/index.js --name usb-key-song-update

echo "💾 Sauvegarde de la configuration PM2..."
pm2 save

echo "🔄 Configuration du démarrage automatique..."
pm2 startup

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║   ✅ INSTALLATION TERMINÉE ! 🎉                             ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Commandes utiles :"
echo "   pm2 status                    # Voir le statut"
echo "   pm2 logs usb-key-song-update  # Voir les logs"
echo "   pm2 restart usb-key-song-update # Redémarrer"
echo "   pm2 stop usb-key-song-update  # Arrêter"
echo ""
echo "🌐 Application accessible à :"
echo "   https://theoherve.fr/USB-KEY-SONG-UPDATE/"
echo ""
