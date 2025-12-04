#!/bin/bash

# LifePattern AI - iOS Deployment Script
# Builds and optionally submits to App Store

set -e  # Exit on error

echo "🍎 LifePattern AI - iOS Deployment"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "app.json" ]; then
    echo "❌ Error: app.json not found!"
    echo "Please run this script from the frontend directory"
    exit 1
fi

# Read current version
CURRENT_VERSION=$(grep -o '"version": "[^"]*' app.json | grep -o '[^"]*$')
CURRENT_BUILD=$(grep -o '"buildNumber": "[^"]*' app.json | grep -o '[^"]*$')

echo "📋 Current Configuration:"
echo "   Version: $CURRENT_VERSION"
echo "   Build Number: $CURRENT_BUILD"
echo ""

# Ask for build type
echo "Select build type:"
echo "1) Development (for device testing)"
echo "2) Preview (for TestFlight)"
echo "3) Production (for App Store)"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        PROFILE="development"
        echo "📱 Building development IPA..."
        echo ""
        echo "ℹ️  Make sure your device is registered:"
        echo "   Run: eas device:create"
        ;;
    2)
        PROFILE="preview"
        echo "📱 Building preview IPA for TestFlight..."
        ;;
    3)
        PROFILE="production"
        echo "📦 Building production IPA for App Store..."

        # Warn about version increment
        echo ""
        echo "⚠️  IMPORTANT: Have you incremented the version?"
        echo "   Current: v$CURRENT_VERSION (build: $CURRENT_BUILD)"
        echo "   Next should be: v1.0.6 (build: 7) or higher"
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
echo "This may take 15-30 minutes..."
echo ""

# Build
eas build --platform ios --profile $PROFILE

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Download the build from the link above"

    if [ "$PROFILE" = "production" ]; then
        echo "2. Upload IPA to App Store Connect"
        echo "3. Configure version information"
        echo "4. Submit for review"
        echo ""
        read -p "Auto-submit to App Store? [y/N]: " submit
        if [[ $submit =~ ^[Yy]$ ]]; then
            echo "📤 Submitting to App Store..."
            echo ""
            echo "You'll need:"
            echo "- Apple ID: oschagollan@gmail.com"
            echo "- App-specific password (from appleid.apple.com)"
            echo ""
            eas submit --platform ios --profile production
        fi
    elif [ "$PROFILE" = "preview" ]; then
        echo "2. IPA will be uploaded to TestFlight automatically"
        echo "3. Invite testers in App Store Connect"
    else
        echo "2. Install on your registered device"
    fi
else
    echo ""
    echo "❌ Build failed!"
    echo "Check the error messages above"
    exit 1
fi
