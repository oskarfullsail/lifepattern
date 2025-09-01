#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Android Development Setup for LifePattern${NC}"
echo "=================================================="

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the frontend directory${NC}"
    exit 1
fi

# Check Node.js and npm
echo -e "\n${YELLOW}1. Checking Node.js and npm...${NC}"
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js version: $(node --version)${NC}"
else
    echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

if command -v npm &> /dev/null; then
    echo -e "${GREEN}✅ npm version: $(npm --version)${NC}"
else
    echo -e "${RED}❌ npm not found. Please install npm first.${NC}"
    exit 1
fi

# Check Expo CLI
echo -e "\n${YELLOW}2. Checking Expo CLI...${NC}"
if command -v expo &> /dev/null; then
    echo -e "${GREEN}✅ Expo CLI version: $(expo --version)${NC}"
else
    echo -e "${YELLOW}⚠️  Expo CLI not found. Installing...${NC}"
    npm install -g @expo/cli
fi

# Check Android SDK
echo -e "\n${YELLOW}3. Checking Android SDK...${NC}"
if [ -n "$ANDROID_HOME" ]; then
    echo -e "${GREEN}✅ ANDROID_HOME is set: $ANDROID_HOME${NC}"
else
    echo -e "${YELLOW}⚠️  ANDROID_HOME not set. Checking common locations...${NC}"
    
    # Check common Android SDK locations
    ANDROID_LOCATIONS=(
        "$HOME/Library/Android/sdk"  # macOS
        "$HOME/Android/Sdk"          # Linux
        "$HOME/AppData/Local/Android/Sdk"  # Windows
        "/usr/local/android-sdk"
    )
    
    for location in "${ANDROID_LOCATIONS[@]}"; do
        if [ -d "$location" ]; then
            echo -e "${GREEN}✅ Found Android SDK at: $location${NC}"
            echo -e "${YELLOW}💡 Add this to your shell profile:${NC}"
            echo "export ANDROID_HOME=$location"
            echo "export PATH=\$PATH:\$ANDROID_HOME/emulator:\$ANDROID_HOME/platform-tools"
            break
        fi
    done
fi

# Check ADB
echo -e "\n${YELLOW}4. Checking ADB (Android Debug Bridge)...${NC}"
if command -v adb &> /dev/null; then
    echo -e "${GREEN}✅ ADB found: $(adb version | head -n 1)${NC}"
    
    # Check for connected devices
    echo -e "\n${YELLOW}5. Checking for connected devices...${NC}"
    devices=$(adb devices)
    if echo "$devices" | grep -q "device$"; then
        echo -e "${GREEN}✅ Connected devices found:${NC}"
        echo "$devices"
    else
        echo -e "${YELLOW}⚠️  No physical devices connected${NC}"
    fi
else
    echo -e "${RED}❌ ADB not found. Please install Android SDK Platform-Tools${NC}"
    echo -e "${YELLOW}💡 Install via Android Studio: Tools → SDK Manager → SDK Tools → Android SDK Platform-Tools${NC}"
fi

# Check Android Emulator
echo -e "\n${YELLOW}6. Checking Android Emulator...${NC}"
if command -v emulator &> /dev/null; then
    echo -e "${GREEN}✅ Android Emulator found${NC}"
    
    # List available AVDs
    echo -e "\n${YELLOW}7. Available Android Virtual Devices (AVDs):${NC}"
    if command -v avdmanager &> /dev/null; then
        avds=$(avdmanager list avd)
        if [ -n "$avds" ]; then
            echo -e "${GREEN}✅ Available AVDs:${NC}"
            echo "$avds"
        else
            echo -e "${YELLOW}⚠️  No AVDs found. Create one in Android Studio: Tools → AVD Manager${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  AVD Manager not found${NC}"
    fi
else
    echo -e "${RED}❌ Android Emulator not found${NC}"
    echo -e "${YELLOW}💡 Install via Android Studio: Tools → SDK Manager → SDK Tools → Android Emulator${NC}"
fi

# Check Expo development server
echo -e "\n${YELLOW}8. Checking Expo development server...${NC}"
if [ -f "node_modules/.bin/expo" ]; then
    echo -e "${GREEN}✅ Expo dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Installing Expo dependencies...${NC}"
    npm install
fi

# Provide next steps
echo -e "\n${BLUE}🎯 Next Steps:${NC}"
echo "=================="
echo -e "${YELLOW}Option 1: Use Android Studio Emulator${NC}"
echo "1. Open Android Studio"
echo "2. Go to Tools → AVD Manager"
echo "3. Create a new Virtual Device"
echo "4. Start the emulator"
echo "5. Run: npm run android"

echo -e "\n${YELLOW}Option 2: Use Physical Android Device${NC}"
echo "1. Enable Developer Options (tap Build Number 7 times)"
echo "2. Enable USB Debugging"
echo "3. Connect device via USB"
echo "4. Run: npm run android"

echo -e "\n${YELLOW}Option 3: Use Expo Go App (Recommended for testing)${NC}"
echo "1. Install Expo Go from Google Play Store"
echo "2. Run: npm start"
echo "3. Scan QR code with Expo Go app"

echo -e "\n${GREEN}✅ Setup check complete!${NC}" 