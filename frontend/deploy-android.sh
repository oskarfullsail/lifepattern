#!/bin/bash

# LifePattern AI - Android Deployment Script
# Builds and optionally submits to Google Play Store

set -e  # Exit on error

echo "🤖 LifePattern AI - Android Deployment"
echo "======================================="
echo ""

# Check if we're in the right directory
if [ ! -f "app.json" ]; then
    echo "❌ Error: app.json not found!"
    echo "Please run this script from the frontend directory"
    exit 1
fi

# Read current version
CURRENT_VERSION=$(grep -o '"version": "[^"]*' app.json | grep -o '[^"]*$')
CURRENT_VERSION_CODE=$(grep -o '"versionCode": [0-9]*' app.json | grep -o '[0-9]*$')

echo "📋 Current Configuration:"
echo "   Version: $CURRENT_VERSION"
echo "   Version Code: $CURRENT_VERSION_CODE"
echo ""

# Ask for build type
echo "Select build type:"
echo "1) Development (APK for testing)"
echo "2) Preview (Release APK for internal testing)"
echo "3) Production (App Bundle for Play Store)"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        PROFILE="development"
        echo "📱 Building development APK..."
        ;;
    2)
        PROFILE="preview"
        echo "📱 Building preview APK..."
        ;;
    3)
        PROFILE="production"
        echo "📦 Building production App Bundle..."

        # Warn about version increment
        echo ""
        echo "⚠️  IMPORTANT: Have you incremented the version?"
        echo "   Current: v$CURRENT_VERSION (code: $CURRENT_VERSION_CODE)"
        echo "   Next should be: v1.0.6 (code: 13) or higher"
        echo ""
        read -p "Continue with build? [y/N]: " confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then
            echo "Cancelled. Please update version in app.json first."
            exit 0
        fi
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🚀 Starting EAS build..."
echo "This may take 10-20 minutes..."
echo ""

# Build
eas build --platform android --profile $PROFILE

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Download the build from the link above"

    if [ "$PROFILE" = "production" ]; then
        echo "2. Upload AAB to Google Play Console"
        echo "3. Fill in release notes"
        echo "4. Submit for review"
        echo ""
        read -p "Auto-submit to Play Store? [y/N]: " submit
        if [[ $submit =~ ^[Yy]$ ]]; then
            echo "📤 Submitting to Google Play..."
            eas submit --platform android --profile production
        fi
    else
        echo "2. Install on your device for testing"
    fi
else
    echo ""
    echo "❌ Build failed!"
    echo "Check the error messages above"
    exit 1
fi
