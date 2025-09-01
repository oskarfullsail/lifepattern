#!/bin/bash

echo "🔄 Testing Token Refresh Flow"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Check if we can get a fresh token by logging in
echo -e "\n${BLUE}1. Testing Login to Get Fresh Token...${NC}"

# You'll need to provide valid credentials here
# For now, let's test with a known user
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:19006/" \
  -d '{
    "username": "High-Maker-627",
    "passphrase": "4u4jgph30wu67161",
    "device_label": "Test Device"
  }')

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Login successful${NC}"
    echo "Response: $LOGIN_RESPONSE"
    
    # Extract tokens
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
    REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.refresh_token')
    
    echo -e "\n${BLUE}2. Testing API Endpoints with Fresh Token...${NC}"
    
    # Test device info
    DEVICE_RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Origin: http://localhost:19006/" \
      http://localhost:8080/api/device/info)
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Device info endpoint working${NC}"
        echo "Response: $DEVICE_RESPONSE"
    else
        echo -e "${RED}❌ Device info endpoint failed${NC}"
    fi
    
    # Test link status
    STATUS_RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Origin: http://localhost:19006/" \
      http://localhost:8080/api/auth/link/status)
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Link status endpoint working${NC}"
        echo "Response: $STATUS_RESPONSE"
    else
        echo -e "${RED}❌ Link status endpoint failed${NC}"
    fi
    
    echo -e "\n${BLUE}3. Testing Token Refresh...${NC}"
    
    # Test token refresh
    REFRESH_RESPONSE=$(curl -s -X POST http://localhost:8080/auth/refresh \
      -H "Content-Type: application/json" \
      -H "Origin: http://localhost:19006/" \
      -d "{\"refresh_token\": \"$REFRESH_TOKEN\"}")
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Token refresh successful${NC}"
        echo "Response: $REFRESH_RESPONSE"
        
        # Extract new access token
        NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.access_token')
        
        echo -e "\n${BLUE}4. Testing API with Refreshed Token...${NC}"
        
        # Test device info with new token
        NEW_DEVICE_RESPONSE=$(curl -s -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
          -H "Origin: http://localhost:19006/" \
          http://localhost:8080/api/device/info)
        
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}✅ Device info with refreshed token working${NC}"
            echo "Response: $NEW_DEVICE_RESPONSE"
        else
            echo -e "${RED}❌ Device info with refreshed token failed${NC}"
        fi
    else
        echo -e "${RED}❌ Token refresh failed${NC}"
        echo "Response: $REFRESH_RESPONSE"
    fi
    
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
fi

echo -e "\n${GREEN}🎉 Token refresh test completed!${NC}"
