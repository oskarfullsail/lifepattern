#!/bin/bash

# LifePattern AI - Mobile App Deployment Script
# This script helps you deploy the app to iOS and Android app stores

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="/Users/oskarsanchez-chagollan/School_Projects/lifepattern/frontend"
PRIVACY_POLICY_URL="https://lifepattern-ai.web.app/privacy-policy.html"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  LifePattern AI - Deployment Script${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Change to frontend directory
cd "$FRONTEND_DIR" || exit 1

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists npm; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm is installed${NC}"

if ! command_exists firebase; then
    echo -e "${RED}✗ firebase CLI is not installed${NC}"
    echo "Install with: npm install -g firebase-tools"
    exit 1
fi
echo -e "${GREEN}✓ firebase CLI is installed${NC}"

if ! command_exists eas; then
    echo -e "${RED}✗ eas CLI is not installed${NC}"
    echo "Install with: npm install -g eas-cli"
    exit 1
fi
echo -e "${GREEN}✓ eas CLI is installed${NC}"

echo ""

# Menu
echo -e "${BLUE}What would you like to deploy?${NC}"
echo ""
echo "1) Deploy Privacy Policy to Firebase"
echo "2) Build iOS App"
echo "3) Build Android App"
echo "4) Build Both iOS and Android"
echo "5) Submit iOS to App Store"
echo "6) Submit Android to Play Store"
echo "7) Submit Both to App Stores"
echo "8) Full Deployment (Privacy Policy + Build + Submit)"
echo "9) Exit"
echo ""
read -p "Enter your choice [1-9]: " choice

case $choice in
    1)
        echo -e "${YELLOW}Deploying Privacy Policy to Firebase...${NC}"

        # Build web version
        echo -e "${YELLOW}Building web version...${NC}"
        npm run build:web

        # Copy privacy policy
        echo -e "${YELLOW}Copying privacy policy...${NC}"
        cp public/privacy-policy.html web-build/

        # Deploy to Firebase
        echo -e "${YELLOW}Deploying to Firebase...${NC}"
        firebase deploy --only hosting

        echo ""
        echo -e "${GREEN}✓ Privacy policy deployed!${NC}"
        echo -e "${GREEN}URL: ${PRIVACY_POLICY_URL}${NC}"
        ;;

    2)
        echo -e "${YELLOW}Building iOS app...${NC}"
        eas build --platform ios --profile production
        echo ""
        echo -e "${GREEN}✓ iOS build started!${NC}"
        echo "Monitor progress at: https://expo.dev"
        ;;

    3)
        echo -e "${YELLOW}Building Android app...${NC}"
        eas build --platform android --profile production
        echo ""
        echo -e "${GREEN}✓ Android build started!${NC}"
        echo "Monitor progress at: https://expo.dev"
        ;;

    4)
        echo -e "${YELLOW}Building both iOS and Android apps...${NC}"
        eas build --platform all --profile production
        echo ""
        echo -e "${GREEN}✓ Builds started!${NC}"
        echo "Monitor progress at: https://expo.dev"
        ;;

    5)
        echo -e "${YELLOW}Submitting iOS to App Store...${NC}"
        eas submit --platform ios --latest
        echo ""
        echo -e "${GREEN}✓ iOS submitted to App Store!${NC}"
        echo "Check status at: https://appstoreconnect.apple.com/apps/6754825838"
        ;;

    6)
        echo -e "${YELLOW}Submitting Android to Play Store...${NC}"
        eas submit --platform android --latest
        echo ""
        echo -e "${GREEN}✓ Android submitted to Play Store!${NC}"
        echo "Check status at: https://play.google.com/console/"
        ;;

    7)
        echo -e "${YELLOW}Submitting both to app stores...${NC}"
        echo ""
        echo -e "${YELLOW}Submitting iOS...${NC}"
        eas submit --platform ios --latest
        echo ""
        echo -e "${YELLOW}Submitting Android...${NC}"
        eas submit --platform android --latest
        echo ""
        echo -e "${GREEN}✓ Both apps submitted!${NC}"
        ;;

    8)
        echo -e "${YELLOW}Starting full deployment...${NC}"
        echo ""

        # Step 1: Privacy Policy
        echo -e "${BLUE}Step 1/3: Deploying Privacy Policy${NC}"
        npm run build:web
        cp public/privacy-policy.html web-build/
        firebase deploy --only hosting
        echo -e "${GREEN}✓ Privacy policy deployed!${NC}"
        echo ""

        # Step 2: Build Apps
        echo -e "${BLUE}Step 2/3: Building Mobile Apps${NC}"
        eas build --platform all --profile production
        echo -e "${GREEN}✓ Builds started!${NC}"
        echo ""

        echo -e "${YELLOW}Waiting for builds to complete...${NC}"
        echo "This may take 20-30 minutes."
        echo "You can monitor progress at: https://expo.dev"
        echo ""
        read -p "Press Enter when builds are complete to continue with submission..."

        # Step 3: Submit to Stores
        echo -e "${BLUE}Step 3/3: Submitting to App Stores${NC}"
        eas submit --platform ios --latest
        eas submit --platform android --latest
        echo -e "${GREEN}✓ Full deployment complete!${NC}"
        ;;

    9)
        echo "Exiting..."
        exit 0
        ;;

    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}Deployment task completed!${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Privacy Policy: $PRIVACY_POLICY_URL"
echo "2. iOS App Store: https://appstoreconnect.apple.com/apps/6754825838"
echo "3. Google Play Console: https://play.google.com/console/"
echo ""
echo "For help, see: school_docs/dev/deployment-commands.md"
