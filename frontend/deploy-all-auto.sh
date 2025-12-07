#!/bin/bash

# LifePattern AI - Complete Deployment Script (Auto-confirm)
# Increments version and deploys to Firebase (web) and Expo (mobile)
# Usage: ./deploy-all-auto.sh [web|mobile|both]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

DEPLOY_TARGET=${1:-both}  # Default to both

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  LifePattern AI - Complete Deployment${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found!${NC}"
    echo "Please run this script from the frontend directory"
    exit 1
fi

# Function to increment version
increment_version() {
    local version=$1
    local part=$2  # "major", "minor", or "patch"
    
    IFS='.' read -ra VERSION_PARTS <<< "$version"
    major=${VERSION_PARTS[0]}
    minor=${VERSION_PARTS[1]}
    patch=${VERSION_PARTS[2]}
    
    case $part in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch)
            patch=$((patch + 1))
            ;;
    esac
    
    echo "$major.$minor.$patch"
}

# Step 1: Read current versions
echo -e "${CYAN}📋 Step 1: Reading current versions...${NC}"

CURRENT_PACKAGE_VERSION=$(node -p "require('./package.json').version")
CURRENT_APP_VERSION=$(node -p "require('./app.json').expo.version")
CURRENT_IOS_BUILD=$(node -p "require('./app.json').expo.ios.buildNumber")
CURRENT_ANDROID_VERSION=$(node -p "require('./app.json').expo.android.versionCode")

echo -e "   Package.json version: ${YELLOW}$CURRENT_PACKAGE_VERSION${NC}"
echo -e "   App.json version: ${YELLOW}$CURRENT_APP_VERSION${NC}"
echo -e "   iOS build number: ${YELLOW}$CURRENT_IOS_BUILD${NC}"
echo -e "   Android version code: ${YELLOW}$CURRENT_ANDROID_VERSION${NC}"
echo ""

# Step 2: Increment versions
echo -e "${CYAN}🔢 Step 2: Incrementing versions...${NC}"

NEW_PACKAGE_VERSION=$(increment_version "$CURRENT_PACKAGE_VERSION" "patch")
NEW_APP_VERSION=$(increment_version "$CURRENT_APP_VERSION" "patch")
NEW_IOS_BUILD=$((CURRENT_IOS_BUILD + 1))
NEW_ANDROID_VERSION=$((CURRENT_ANDROID_VERSION + 1))

echo -e "   New package.json version: ${GREEN}$NEW_PACKAGE_VERSION${NC}"
echo -e "   New app.json version: ${GREEN}$NEW_APP_VERSION${NC}"
echo -e "   New iOS build number: ${GREEN}$NEW_IOS_BUILD${NC}"
echo -e "   New Android version code: ${GREEN}$NEW_ANDROID_VERSION${NC}"
echo ""

# Step 3: Update package.json
echo -e "${CYAN}📝 Step 3: Updating package.json...${NC}"
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$NEW_PACKAGE_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
echo -e "${GREEN}✅ package.json updated${NC}"
echo ""

# Step 4: Update app.json
echo -e "${CYAN}📝 Step 4: Updating app.json...${NC}"
node -e "
const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.expo.version = '$NEW_APP_VERSION';
app.expo.ios.buildNumber = '$NEW_IOS_BUILD';
app.expo.android.versionCode = $NEW_ANDROID_VERSION;
fs.writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
"
echo -e "${GREEN}✅ app.json updated${NC}"
echo ""

# Step 5: Deploy to Firebase (Web)
if [[ "$DEPLOY_TARGET" == "web" || "$DEPLOY_TARGET" == "both" ]]; then
    echo -e "${CYAN}🌐 Step 5: Deploying to Firebase (Web)...${NC}"
    
    # Check if firebase CLI is installed
    if ! command -v firebase >/dev/null 2>&1; then
        echo -e "${RED}❌ firebase CLI not found${NC}"
        echo "Install with: npm install -g firebase-tools"
        exit 1
    fi
    
    # Clean previous build
    echo "   Cleaning previous build..."
    rm -rf dist/
    
    # Build for production
    echo "   Building for web (production)..."
    npm run build:web:production
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Web build failed!${NC}"
        exit 1
    fi
    
    # Copy privacy policy
    if [ -f "public/privacy-policy.html" ]; then
        cp public/privacy-policy.html dist/
        echo "   Privacy policy copied"
    fi
    
    # Deploy to Firebase
    echo "   Deploying to Firebase..."
    firebase deploy --only hosting
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Web deployment successful!${NC}"
        echo -e "   🌐 Live at: https://lifepattern-ai.web.app"
    else
        echo -e "${RED}❌ Web deployment failed!${NC}"
        exit 1
    fi
    echo ""
fi

# Step 6: Deploy to Expo (Mobile)
if [[ "$DEPLOY_TARGET" == "mobile" || "$DEPLOY_TARGET" == "both" ]]; then
    echo -e "${CYAN}📱 Step 6: Deploying to Expo (Mobile)...${NC}"
    
    # Check if eas CLI is installed
    if ! command -v eas >/dev/null 2>&1; then
        echo -e "${RED}❌ eas CLI not found${NC}"
        echo "Install with: npm install -g eas-cli"
        exit 1
    fi
    
    # Build both platforms
    echo -e "${YELLOW}Building both iOS and Android apps...${NC}"
    eas build --platform all --profile production
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Mobile build started!${NC}"
        echo -e "   📱 Building: iOS and Android"
        echo -e "   🔗 Monitor at: https://expo.dev"
        echo ""
        echo -e "${YELLOW}Note: Builds may take 20-30 minutes to complete${NC}"
        echo -e "${YELLOW}You can check progress at: https://expo.dev${NC}"
    else
        echo -e "${RED}❌ Mobile build failed!${NC}"
        exit 1
    fi
    echo ""
fi

# Summary
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}✅ Deployment Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${CYAN}Version Updates:${NC}"
echo -e "   Package.json: $CURRENT_PACKAGE_VERSION → $NEW_PACKAGE_VERSION"
echo -e "   App.json: $CURRENT_APP_VERSION → $NEW_APP_VERSION"
echo -e "   iOS build: $CURRENT_IOS_BUILD → $NEW_IOS_BUILD"
echo -e "   Android version: $CURRENT_ANDROID_VERSION → $NEW_ANDROID_VERSION"
echo ""

if [[ "$DEPLOY_TARGET" == "web" || "$DEPLOY_TARGET" == "both" ]]; then
    echo -e "${CYAN}Web Deployment:${NC}"
    echo -e "   ✅ https://lifepattern-ai.web.app"
fi

if [[ "$DEPLOY_TARGET" == "mobile" || "$DEPLOY_TARGET" == "both" ]]; then
    echo -e "${CYAN}Mobile Deployment:${NC}"
    echo -e "   ✅ iOS and Android builds started"
    echo -e "   🔗 Monitor: https://expo.dev"
fi

echo ""
echo -e "${CYAN}Next Steps:${NC}"
if [[ "$DEPLOY_TARGET" == "mobile" || "$DEPLOY_TARGET" == "both" ]]; then
    echo "   1. Wait for builds to complete (20-30 minutes)"
    echo "   2. Submit to app stores:"
    echo "      - iOS: eas submit --platform ios --latest"
    echo "      - Android: eas submit --platform android --latest"
fi
if [[ "$DEPLOY_TARGET" == "web" || "$DEPLOY_TARGET" == "both" ]]; then
    echo "   1. Test the web deployment"
    echo "   2. Verify all features work"
fi
echo ""
echo -e "${BLUE}================================================${NC}"

