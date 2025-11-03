#!/bin/bash

# 🚀 USB Key Song Update - Quick Start Script

echo "🎧 USB Key Song Update - OAuth 2.0 Setup"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "📝 Please edit .env and add your Spotify credentials:"
    echo "   - SPOTIFY_CLIENT_ID"
    echo "   - SPOTIFY_CLIENT_SECRET"
    echo ""
    echo "Then run this script again!"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build
echo ""

# Start the server
echo "🚀 Starting web interface..."
echo ""
echo "✨ Ready! Open your browser:"
echo ""
echo "   🏠 Dashboard:  http://localhost:3000"
echo "   🔌 Connect:    http://localhost:3000/connect"
echo "   ⚙️  Settings:   http://localhost:3000/settings"
echo ""
echo "📚 First time setup:"
echo "   1. Go to Settings and add your Spotify Client ID & Secret"
echo "   2. Go to Connect and click 'Connect Spotify'"
echo "   3. That's it! 🎉"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
