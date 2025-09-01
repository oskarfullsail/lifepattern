#!/bin/bash

echo "🍎 iOS Token Refresh Debug Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "\n${BLUE}1. Testing Backend Token Refresh Endpoint...${NC}"

# Test with a known refresh token
REFRESH_RESPONSE=$(curl -s -X POST http://localhost:8080/auth/refresh \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:19006/" \
  -d '{
    "refresh_token": "YnQw+GrzZSbU/WBjemeTSuoynIZf0dvLgJWGu2iD3xc="
  }')

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Backend refresh endpoint accessible${NC}"
    echo "Response: $REFRESH_RESPONSE"
else
    echo -e "${RED}❌ Backend refresh endpoint failed${NC}"
    echo "Response: $REFRESH_RESPONSE"
fi

echo -e "\n${BLUE}2. Testing CORS for Refresh Endpoint...${NC}"

CORS_RESPONSE=$(curl -s -H "Origin: http://localhost:19006/" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS http://localhost:8080/auth/refresh -v 2>&1)

if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✅ CORS headers present for refresh endpoint${NC}"
else
    echo -e "${YELLOW}⚠️  CORS headers may be missing${NC}"
fi

echo -e "\n${BLUE}3. iOS-Specific Debugging Tips...${NC}"

echo -e "${YELLOW}Common iOS Token Issues:${NC}"
echo "1. 🔐 Keychain Access - iOS may block keychain access"
echo "2. 📱 App Background - iOS kills background processes"
echo "3. 🌐 Network Security - iOS has stricter network policies"
echo "4. 🔄 App State - iOS handles app lifecycle differently"

echo -e "\n${YELLOW}Debugging Steps:${NC}"
echo "1. Check console logs for '🍎 iOS:' messages"
echo "2. Verify tokens are stored in SecureStore"
echo "3. Test network connectivity on iOS device"
echo "4. Check app permissions and keychain access"

echo -e "\n${YELLOW}Testing Commands:${NC}"
echo "1. In your app, call: userManager.validateTokens()"
echo "2. Check console for token validation output"
echo "3. Test force refresh: userManager.forceTokenRefresh()"
echo "4. Monitor network requests in iOS Safari dev tools"

echo -e "\n${GREEN}🎉 iOS Debug Script Complete!${NC}"
echo -e "\n${BLUE}Next Steps:${NC}"
echo "1. Run the app on iOS device/simulator"
echo "2. Check console logs for iOS-specific messages"
echo "3. Test token refresh functionality"
echo "4. Verify SecureStore is working properly"
