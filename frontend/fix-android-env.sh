#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Quick Android Environment Fix${NC}"
echo "======================================"

# Set Android environment variables for current session
export ANDROID_HOME="/Users/oskarsanchez-chagollan/Library/Android/sdk"
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

echo -e "${GREEN}✅ Set ANDROID_HOME to: $ANDROID_HOME${NC}"
echo -e "${GREEN}✅ Added Android tools to PATH${NC}"

# Check if ADB is now available
if command -v adb &> /dev/null; then
    echo -e "${GREEN}✅ ADB is now available!${NC}"
else
    echo -e "${YELLOW}⚠️  ADB still not found. You need to install Android SDK Platform-Tools${NC}"
    echo -e "${YELLOW}💡 Quick fix: Install via Android Studio${NC}"
    echo "1. Open Android Studio"
    echo "2. Go to Tools → SDK Manager"
    echo "3. Click 'SDK Tools' tab"
    echo "4. Check 'Android SDK Platform-Tools'"
    echo "5. Click 'Apply' and install"
fi

# Check if emulator is now available
if command -v emulator &> /dev/null; then
    echo -e "${GREEN}✅ Android Emulator is now available!${NC}"
else
    echo -e "${YELLOW}⚠️  Android Emulator still not found. You need to install Android Emulator${NC}"
    echo -e "${YELLOW}💡 Quick fix: Install via Android Studio${NC}"
    echo "1. Open Android Studio"
    echo "2. Go to Tools → SDK Manager"
    echo "3. Click 'SDK Tools' tab"
    echo "4. Check 'Android Emulator'"
    echo "5. Click 'Apply' and install"
fi

echo -e "\n${BLUE}🎯 Recommended Quick Solution:${NC}"
echo "======================================"
echo -e "${GREEN}✅ Use Expo Go App (Easiest & Fastest)${NC}"
echo "1. Install 'Expo Go' from Google Play Store on your Android device"
echo "2. Run: npm start"
echo "3. Scan the QR code with Expo Go app"
echo "4. Your app will load instantly!"

echo -e "\n${YELLOW}💡 To make these environment variables permanent:${NC}"
echo "Add these lines to your ~/.zshrc file:"
echo "export ANDROID_HOME=\"/Users/oskarsanchez-chagollan/Library/Android/sdk\""
echo "export PATH=\$PATH:\$ANDROID_HOME/emulator:\$ANDROID_HOME/platform-tools"

echo -e "\n${GREEN}✅ Environment fix complete!${NC}" 