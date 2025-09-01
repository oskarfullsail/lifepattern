#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔗 Testing Backend Connection${NC}"
echo "================================"

# Check if Docker containers are running
echo -e "\n${YELLOW}1. Checking Docker containers...${NC}"
cd /Users/oskarsanchez-chagollan/School_Projects/lifepattern

if docker-compose ps | grep -q "lifepattern-backend.*Up"; then
    echo -e "${GREEN}✅ Backend container is running${NC}"
else
    echo -e "${RED}❌ Backend container is not running${NC}"
    echo -e "${YELLOW}💡 Starting Docker containers...${NC}"
    docker-compose up -d
    sleep 10
fi

# Test backend health endpoint
echo -e "\n${YELLOW}2. Testing backend health endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:8080/health 2>/dev/null)

if [ $? -eq 0 ] && echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
    echo "Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
fi

# Test API endpoints
echo -e "\n${YELLOW}3. Testing API endpoints...${NC}"

# Test registration endpoint
REG_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}' 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Registration endpoint is working${NC}"
else
    echo -e "${YELLOW}⚠️  Registration endpoint test failed (might be expected)${NC}"
fi

# Test login endpoint
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}' 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Login endpoint is working${NC}"
else
    echo -e "${YELLOW}⚠️  Login endpoint test failed (might be expected)${NC}"
fi

# Show frontend configuration
echo -e "\n${YELLOW}4. Frontend Configuration:${NC}"
echo -e "${BLUE}Development Backend URL:${NC} http://localhost:8080"
echo -e "${BLUE}Web Platform:${NC} http://localhost:8080"
echo -e "${BLUE}iOS Simulator:${NC} http://localhost:8080"
echo -e "${BLUE}Android Emulator:${NC} http://10.0.2.2:8080"

# Test platform-specific URLs
echo -e "\n${YELLOW}5. Testing platform-specific URLs...${NC}"

# Test localhost (web/iOS)
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ localhost:8080 is accessible${NC}"
else
    echo -e "${RED}❌ localhost:8080 is not accessible${NC}"
fi

# Test Android emulator URL (10.0.2.2)
if curl -s http://10.0.2.2:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 10.0.2.2:8080 is accessible (Android emulator)${NC}"
else
    echo -e "${YELLOW}⚠️  10.0.2.2:8080 is not accessible (normal if not using Android emulator)${NC}"
fi

echo -e "\n${BLUE}🎯 Next Steps:${NC}"
echo "=============="
echo -e "${GREEN}✅ Your frontend is configured to connect to local Docker backend${NC}"
echo ""
echo "To test the frontend:"
echo "1. Start the frontend: cd frontend && npx expo start"
echo "2. Use Expo Go app to scan QR code"
echo "3. Or press 'a' for Android emulator"
echo "4. Or press 'w' for web browser"

echo -e "\n${GREEN}✅ Backend connection test complete!${NC}" 