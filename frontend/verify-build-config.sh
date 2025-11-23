#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  LifePattern AI - Build Configuration Checker${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Check if we're in the frontend directory
if [ ! -f "app.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the frontend directory${NC}"
    exit 1
fi

# Function to check JSON value
check_json_value() {
    local file=$1
    local path=$2
    local expected=$3
    local description=$4
    
    local value=$(node -e "const fs = require('fs'); const json = JSON.parse(fs.readFileSync('$file', 'utf8')); console.log(JSON.stringify(json.$path));" 2>/dev/null)
    
    if [ "$value" == "\"$expected\"" ] || [ "$value" == "$expected" ]; then
        echo -e "${GREEN}✅ $description: $expected${NC}"
        return 0
    else
        echo -e "${RED}❌ $description: Expected '$expected', but found $value${NC}"
        return 1
    fi
}

# Function to check JSON number value
check_json_number() {
    local file=$1
    local path=$2
    local expected=$3
    local description=$4
    
    local value=$(node -e "const fs = require('fs'); const json = JSON.parse(fs.readFileSync('$file', 'utf8')); console.log(json.$path);" 2>/dev/null)
    
    if [ "$value" == "$expected" ]; then
        echo -e "${GREEN}✅ $description: $expected${NC}"
        return 0
    else
        echo -e "${RED}❌ $description: Expected '$expected', but found $value${NC}"
        return 1
    fi
}

# Function to check if JSON path exists
check_json_exists() {
    local file=$1
    local path=$2
    local description=$3
    
    local value=$(node -e "const fs = require('fs'); const json = JSON.parse(fs.readFileSync('$file', 'utf8')); try { const val = json.$path; console.log(val !== undefined ? 'EXISTS' : 'MISSING'); } catch(e) { console.log('MISSING'); }" 2>/dev/null)
    
    if [ "$value" == "EXISTS" ]; then
        echo -e "${GREEN}✅ $description: Found${NC}"
        return 0
    else
        echo -e "${RED}❌ $description: Not found${NC}"
        return 1
    fi
}

echo -e "${YELLOW}Checking app.json configuration...${NC}"
echo ""

# Check app version
check_json_value "app.json" "expo.version" "1.0.1" "App Version" || ((ERRORS++))

# Check iOS build number
check_json_value "app.json" "expo.ios.buildNumber" "1.0.1" "iOS Build Number" || ((ERRORS++))

# Check Android version code
check_json_number "app.json" "expo.android.versionCode" "9" "Android Version Code" || ((ERRORS++))

# Check Android targetSdkVersion (direct)
check_json_number "app.json" "expo.android.targetSdkVersion" "35" "Android targetSdkVersion (direct)" || ((ERRORS++))

# Check Android compileSdkVersion (direct)
check_json_number "app.json" "expo.android.compileSdkVersion" "35" "Android compileSdkVersion (direct)" || ((ERRORS++))

# Check expo-build-properties plugin exists
PLUGIN_EXISTS=$(node -e "const fs = require('fs'); const json = JSON.parse(fs.readFileSync('app.json', 'utf8')); const plugins = json.expo.plugins || []; const hasPlugin = plugins.some(p => (Array.isArray(p) && p[0] === 'expo-build-properties') || p === 'expo-build-properties'); console.log(hasPlugin ? 'YES' : 'NO');" 2>/dev/null)

if [ "$PLUGIN_EXISTS" == "YES" ]; then
    echo -e "${GREEN}✅ expo-build-properties plugin: Found${NC}"
    
    # Check plugin Android configuration
    PLUGIN_ANDROID_TARGET=$(node -e "const fs = require('fs'); const json = JSON.parse(fs.readFileSync('app.json', 'utf8')); const plugins = json.expo.plugins || []; const plugin = plugins.find(p => Array.isArray(p) && p[0] === 'expo-build-properties'); if (plugin && plugin[1] && plugin[1].android) { console.log(plugin[1].android.targetSdkVersion || 'NOT_SET'); } else { console.log('NOT_FOUND'); }" 2>/dev/null)
    
    if [ "$PLUGIN_ANDROID_TARGET" == "35" ]; then
        echo -e "${GREEN}✅ Plugin Android targetSdkVersion: 35${NC}"
    else
        echo -e "${RED}❌ Plugin Android targetSdkVersion: Expected 35, found $PLUGIN_ANDROID_TARGET${NC}"
        ((ERRORS++))
    fi
    
    PLUGIN_ANDROID_COMPILE=$(node -e "const fs = require('fs'); const json = JSON.parse(fs.readFileSync('app.json', 'utf8')); const plugins = json.expo.plugins || []; const plugin = plugins.find(p => Array.isArray(p) && p[0] === 'expo-build-properties'); if (plugin && plugin[1] && plugin[1].android) { console.log(plugin[1].android.compileSdkVersion || 'NOT_SET'); } else { console.log('NOT_FOUND'); }" 2>/dev/null)
    
    if [ "$PLUGIN_ANDROID_COMPILE" == "35" ]; then
        echo -e "${GREEN}✅ Plugin Android compileSdkVersion: 35${NC}"
    else
        echo -e "${RED}❌ Plugin Android compileSdkVersion: Expected 35, found $PLUGIN_ANDROID_COMPILE${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${RED}❌ expo-build-properties plugin: Not found${NC}"
    ((ERRORS++))
fi

echo ""
echo -e "${YELLOW}Checking eas.json configuration...${NC}"
echo ""

# Check appVersionSource
check_json_value "eas.json" "cli.appVersionSource" "local" "EAS appVersionSource" || ((ERRORS++))

# Check Android build type
check_json_value "eas.json" "build.production.android.buildType" "app-bundle" "Android Build Type" || ((ERRORS++))

echo ""
echo -e "${YELLOW}Checking package.json...${NC}"
echo ""

# Check if expo-build-properties is installed
if grep -q "\"expo-build-properties\"" package.json; then
    VERSION=$(node -e "const fs = require('fs'); const json = JSON.parse(fs.readFileSync('package.json', 'utf8')); console.log(json.dependencies['expo-build-properties'] || json.devDependencies['expo-build-properties'] || 'NOT_FOUND');" 2>/dev/null)
    echo -e "${GREEN}✅ expo-build-properties package: Installed ($VERSION)${NC}"
else
    echo -e "${RED}❌ expo-build-properties package: Not installed${NC}"
    ((ERRORS++))
fi

echo ""
echo -e "${BLUE}================================================${NC}"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Your configuration is correct.${NC}"
    echo ""
    echo -e "${GREEN}You can now build with:${NC}"
    echo -e "${BLUE}npx eas-cli build --platform android --profile production --clear-cache${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $ERRORS error(s). Please fix the issues above before building.${NC}"
    exit 1
fi

