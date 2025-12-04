#!/bin/bash

# LifePattern AI - Web Deployment Script
# Builds and deploys the web app to Firebase Hosting

set -e  # Exit on error

echo "🚀 LifePattern AI - Web Deployment"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Please run this script from the frontend directory"
    exit 1
fi

# Step 1: Clean previous build
echo "🧹 Step 1/4: Cleaning previous build..."
rm -rf dist/
echo "✅ Cleaned"
echo ""

# Step 2: Build for production
echo "📦 Step 2/4: Building for web (production)..."
npm run build:web:production

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Build completed"
echo ""

# Step 3: Copy privacy policy
echo "📄 Step 3/4: Copying privacy policy..."
if [ -f "public/privacy-policy.html" ]; then
    cp public/privacy-policy.html dist/
    echo "✅ Privacy policy copied"
else
    echo "⚠️  Warning: privacy-policy.html not found in public/"
fi
echo ""

# Step 4: Deploy to Firebase
echo "🌐 Step 4/4: Deploying to Firebase..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo "🌐 Your app is live at: https://lifepattern-ai.web.app"
    echo ""
    echo "Next steps:"
    echo "1. Test the live site"
    echo "2. Verify all features work"
    echo "3. Check backend connection"
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Try running 'firebase login' first"
    exit 1
fi
