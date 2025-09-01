#!/bin/bash

echo "🧪 Testing Complete LifePattern Flow"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Backend Health
echo -e "\n${BLUE}1. Testing Backend Health...${NC}"
BACKEND_HEALTH=$(curl -s http://localhost:8080/health)
if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
    echo "Response: $BACKEND_HEALTH"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    exit 1
fi

# Test 2: AI Service Health
echo -e "\n${BLUE}2. Testing AI Service Health...${NC}"
AI_HEALTH=$(curl -s http://localhost:8000/health)
if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ AI Service is healthy${NC}"
    echo "Response: $AI_HEALTH"
else
    echo -e "${RED}❌ AI Service health check failed${NC}"
    exit 1
fi

# Test 3: AI Service Prediction
echo -e "\n${BLUE}3. Testing AI Service Prediction...${NC}"
PREDICTION_RESPONSE=$(curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_hours": 7.5,
    "screen_time": 4.2,
    "exercise_duration": 45,
    "water_intake": 8,
    "stress_level": 3,
    "meal_times": ["08:00", "12:30", "19:00"],
    "wake_up_time": "07:00"
  }')

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ AI Service prediction successful${NC}"
    echo "Response: $PREDICTION_RESPONSE" | jq .
else
    echo -e "${RED}❌ AI Service prediction failed${NC}"
    exit 1
fi

# Test 4: Backend API Endpoints
echo -e "\n${BLUE}4. Testing Backend API Endpoints...${NC}"

# Test logs endpoint
LOGS_RESPONSE=$(curl -s http://localhost:8080/api/logs)
if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Backend logs endpoint accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Backend logs endpoint returned error (expected for unauthenticated request)${NC}"
fi

# Test 5: Database Connection
echo -e "\n${BLUE}5. Testing Database Connection...${NC}"
DB_STATUS=$(docker-compose exec -T postgres pg_isready -U postgres)
if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Database is ready${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    exit 1
fi

# Test 6: Container Status
echo -e "\n${BLUE}6. Checking Container Status...${NC}"
docker-compose ps

echo -e "\n${GREEN}🎉 All tests completed!${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Start frontend: cd frontend && npm start"
echo "2. Test on physical device using Expo Go"
echo "3. Test complete user flow: Register → Login → Dashboard → Watch Data"
echo "4. Deploy to production when ready"
