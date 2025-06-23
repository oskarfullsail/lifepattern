#!/bin/bash

echo "🚀 Building for production..."
npm run build:web:production

echo "📦 Deploying to Firebase..."
firebase deploy --only hosting

echo "✅ Deployment complete!" 