#!/bin/bash

echo "🔄 Restarting frontend with PRODUCTION backend..."
echo ""

# Ensure production mode is set
./set-env-prod.sh

echo "🧹 Clearing caches..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf .metro

echo ""
echo "✅ Caches cleared!"
echo ""
echo "🚀 Starting development server with PRODUCTION backend..."
echo ""
echo "⚠️  The server will connect to: https://lifepattern-backend.onrender.com"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start with clear cache flag
npm start -- --clear

