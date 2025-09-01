#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Complete Android Development Fix${NC}"
echo "=========================================="

# Set environment variables
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

echo -e "${GREEN}✅ Environment variables set:${NC}"
echo "ANDROID_HOME: $ANDROID_HOME"
echo "PATH includes Android tools: ✅"

# Check Java installation
echo -e "\n${YELLOW}1. Checking Java installation...${NC}"
if command -v java &> /dev/null; then
    echo -e "${GREEN}✅ Java found: $(java -version 2>&1 | head -n 1)${NC}"
else
    echo -e "${RED}❌ Java not found. Installing...${NC}"
    echo -e "${YELLOW}💡 Installing Java via Homebrew...${NC}"
    
    if command -v brew &> /dev/null; then
        brew install openjdk@17
        echo -e "${GREEN}✅ Java installed via Homebrew${NC}"
    else
        echo -e "${RED}❌ Homebrew not found. Please install Java manually:${NC}"
        echo "1. Download from: https://adoptium.net/"
        echo "2. Install Java 17 or later"
        echo "3. Restart terminal"
    fi
fi

# Check Android tools
echo -e "\n${YELLOW}2. Checking Android tools...${NC}"
if command -v adb &> /dev/null; then
    echo -e "${GREEN}✅ ADB found: $(adb version | head -n 1)${NC}"
else
    echo -e "${RED}❌ ADB not found${NC}"
fi

if command -v emulator &> /dev/null; then
    echo -e "${GREEN}✅ Android Emulator found${NC}"
else
    echo -e "${RED}❌ Android Emulator not found${NC}"
fi

# Check for connected devices
echo -e "\n${YELLOW}3. Checking for connected devices...${NC}"
if command -v adb &> /dev/null; then
    devices=$(adb devices)
    if echo "$devices" | grep -q "device$"; then
        echo -e "${GREEN}✅ Connected devices found:${NC}"
        echo "$devices"
    else
        echo -e "${YELLOW}⚠️  No physical devices connected${NC}"
    fi
fi

# Check for AVDs
echo -e "\n${YELLOW}4. Checking Android Virtual Devices...${NC}"
if [ -f "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" ]; then
    if command -v java &> /dev/null; then
        avds=$($ANDROID_HOME/cmdline-tools/latest/bin/avdmanager list avd 2>/dev/null)
        if [ -n "$avds" ]; then
            echo -e "${GREEN}✅ Available AVDs:${NC}"
            echo "$avds"
        else
            echo -e "${YELLOW}⚠️  No AVDs found${NC}"
        fi
    else
        echo -e "${RED}❌ Java required for AVD management${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  AVD Manager not found${NC}"
fi

# Provide solutions
echo -e "\n${BLUE}🎯 Solutions:${NC}"
echo "=============="

echo -e "\n${GREEN}✅ Option 1: Use Expo Go (RECOMMENDED - No setup needed)${NC}"
echo "1. Install 'Expo Go' from Google Play Store"
echo "2. Run: npm start"
echo "3. Scan QR code with Expo Go app"

echo -e "\n${YELLOW}Option 2: Install Java and Android Studio${NC}"
echo "1. Install Java: brew install openjdk@17"
echo "2. Install Android Studio from: https://developer.android.com/studio"
echo "3. Open Android Studio → Tools → SDK Manager"
echo "4. Install: Android SDK Platform-Tools, Android Emulator"
echo "5. Create AVD: Tools → AVD Manager → Create Virtual Device"

echo -e "\n${YELLOW}Option 3: Use Physical Device${NC}"
echo "1. Enable Developer Options (tap Build Number 7 times)"
echo "2. Enable USB Debugging"
echo "3. Connect device via USB"
echo "4. Run: npm run android"

echo -e "\n${BLUE}💡 Quick Test:${NC}"
echo "=============="
echo "Run this command to test Expo Go:"
echo "npm start"

echo -e "\n${GREEN}✅ Environment fix complete!${NC}" 