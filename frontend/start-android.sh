#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Android Development${NC}"
echo "================================"

# Set environment variables
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

echo -e "${GREEN}✅ Environment variables set${NC}"

# Kill any existing emulator processes
echo -e "\n${YELLOW}1. Cleaning up existing emulator processes...${NC}"
pkill -f "emulator" 2>/dev/null
sleep 2

# Check if emulator is already running
echo -e "\n${YELLOW}2. Checking for running emulator...${NC}"
devices=$(adb devices)
if echo "$devices" | grep -q "emulator-5554"; then
    echo -e "${GREEN}✅ Emulator is already running${NC}"
else
    echo -e "${YELLOW}⚠️  Starting emulator...${NC}"
    echo -e "${BLUE}💡 This may take 1-2 minutes. Please wait...${NC}"
    
    # Start emulator in background
    emulator -avd Pixel_9a &
    EMULATOR_PID=$!
    
    # Wait for emulator to start
    echo -e "${YELLOW}⏳ Waiting for emulator to boot...${NC}"
    for i in {1..60}; do
        devices=$(adb devices 2>/dev/null)
        if echo "$devices" | grep -q "emulator-5554"; then
            echo -e "${GREEN}✅ Emulator is ready!${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # Final check
    devices=$(adb devices)
    if echo "$devices" | grep -q "emulator-5554"; then
        echo -e "\n${GREEN}✅ Emulator successfully started${NC}"
    else
        echo -e "\n${RED}❌ Emulator failed to start${NC}"
        echo -e "${YELLOW}💡 Try starting manually: emulator -avd Pixel_9a${NC}"
        exit 1
    fi
fi

# Show connected devices
echo -e "\n${YELLOW}3. Connected devices:${NC}"
adb devices

# Start the app
echo -e "\n${YELLOW}4. Starting the app...${NC}"
echo -e "${BLUE}💡 Choose your option:${NC}"
echo "1. Use Expo Go (recommended): npx expo start"
echo "2. Use Android emulator: npx expo start"
echo "3. Build for Android: npm run android"

echo -e "\n${GREEN}✅ Ready to run your app!${NC}" 