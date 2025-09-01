#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Fixing Android Error${NC}"
echo "=========================="

# Set environment variables
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

echo -e "${GREEN}✅ Environment variables set${NC}"

# Check if emulator is running
echo -e "\n${YELLOW}1. Checking emulator status...${NC}"
devices=$(adb devices)
if echo "$devices" | grep -q "emulator-5554"; then
    echo -e "${GREEN}✅ Emulator is running${NC}"
else
    echo -e "${RED}❌ Emulator not found. Starting emulator...${NC}"
    emulator -avd Pixel_9a &
    sleep 20
fi

# Clear Metro cache
echo -e "\n${YELLOW}2. Clearing Metro cache...${NC}"
rm -rf node_modules/.cache
rm -rf .expo
echo -e "${GREEN}✅ Cache cleared${NC}"

# Clear React Native cache
echo -e "\n${YELLOW}3. Clearing React Native cache...${NC}"
npx react-native start --reset-cache &
sleep 5
pkill -f "react-native start"
echo -e "${GREEN}✅ React Native cache cleared${NC}"

# Clear Expo cache
echo -e "\n${YELLOW}4. Clearing Expo cache...${NC}"
npx expo start --clear --no-dev --minify &
sleep 5
pkill -f "expo start"
echo -e "${GREEN}✅ Expo cache cleared${NC}"

# Check if app is properly registered
echo -e "\n${YELLOW}5. Checking app registration...${NC}"
if [ -f "index.ts" ] && grep -q "registerRootComponent" index.ts; then
    echo -e "${GREEN}✅ App registration found in index.ts${NC}"
else
    echo -e "${RED}❌ App registration missing${NC}"
fi

echo -e "\n${BLUE}🎯 Next Steps:${NC}"
echo "=============="
echo -e "${GREEN}✅ Option 1: Use Expo Go (Recommended)${NC}"
echo "1. Install Expo Go from Google Play Store"
echo "2. Run: npx expo start"
echo "3. Scan QR code with Expo Go"

echo -e "\n${YELLOW}Option 2: Use Android Emulator${NC}"
echo "1. Make sure emulator is running"
echo "2. Run: npx expo start"
echo "3. Press 'a' to run on Android"

echo -e "\n${GREEN}✅ Android error fix complete!${NC}" 