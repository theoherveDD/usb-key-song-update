#!/bin/bash

# 🚀 Script de déploiement vers OVH via SCP
# Usage: ./deploy-scp.sh

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║   🚀 DÉPLOIEMENT VERS OVH - theoherve.fr                    ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
SERVER="theohet@ssh.cluster100.hosting.ovh.net"
REMOTE_PATH="www/USB-KEY-SONG-UPDATE"

echo "📋 Étape 1/4 : Vérification des fichiers compilés..."
if [ ! -d "dist" ]; then
    echo "❌ Le dossier dist/ n'existe pas. Compilation en cours..."
    npm run build
fi

echo ""
echo "📦 Étape 2/4 : Création d'une archive de déploiement..."
tar -czf deploy.tar.gz \
    dist/ \
    data/ \
    package.json \
    package-lock.json \
    .env.production \
    .htaccess \
    install-on-server.sh

echo "✅ Archive créée : deploy.tar.gz"

echo ""
echo "📤 Étape 3/4 : Envoi vers le serveur OVH..."
echo ""

# Créer le répertoire distant
echo "📁 Création du répertoire distant..."
ssh "$SERVER" "mkdir -p $REMOTE_PATH"

# Envoyer l'archive dans le home d'abord
echo "📤 Envoi de l'archive..."
scp deploy.tar.gz "$SERVER:~/"

# Déplacer vers le bon dossier
echo "📦 Déplacement vers $REMOTE_PATH..."
ssh "$SERVER" "mv ~/deploy.tar.gz $REMOTE_PATH/"

echo ""
echo "📂 Étape 4/4 : Extraction sur le serveur..."

# Extraire et nettoyer sur le serveur
ssh "$SERVER" << 'ENDSSH'
cd www/USB-KEY-SONG-UPDATE

# Extraire l'archive
tar -xzf deploy.tar.gz

# Renommer .env.production en .env
mv .env.production .env

# Nettoyer
rm deploy.tar.gz

echo "✅ Fichiers extraits avec succès !"
echo ""
echo "📋 Prochaine étape : Lancer l'installation"
echo "   Exécutez : bash install-on-server.sh"
ENDSSH

# Nettoyer localement
rm deploy.tar.gz

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║   ✅ FICHIERS ENVOYÉS AVEC SUCCÈS ! 🎉                      ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🔧 Connectez-vous maintenant au serveur pour finaliser :"
echo ""
echo "   ssh $SERVER"
echo "   cd $REMOTE_PATH"
echo "   bash install-on-server.sh"
echo ""
echo "🌐 Ensuite, votre app sera accessible à :"
echo "   https://theoherve.fr/USB-KEY-SONG-UPDATE/"
echo ""
echo "⚠️  N'oubliez pas de mettre à jour le Redirect URI Spotify :"
echo "   https://theoherve.fr/USB-KEY-SONG-UPDATE/api/spotify/callback"
echo ""
