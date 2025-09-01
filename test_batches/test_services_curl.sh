#!/bin/bash

# LifePattern Services Test Script
# Test both AI Service and Backend Service

echo "========================================"
echo "LifePattern Services Test Script"
echo "========================================"
echo

echo "Testing AI Service and Backend Services"
echo "======================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to print status
print_status() {
    local test_name="$1"
    local status="$2"
    
    if [ "$status" = "PASSED" ]; then
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
    else
        echo -e "${RED}❌ $test_name: FAILED${NC}"
    fi
}

# Test 1: AI Service Health Check
echo
echo -e "${BLUE}[1/5] Testing AI Service Health Check...${NC}"
echo "----------------------------------------"
response=$(curl -s -w "%{http_code}" "https://lifepattern-ai-service.onrender.com/health")
http_code="${response: -3}"
response_body="${response%???}"

if [ "$http_code" = "200" ]; then
    print_status "AI Service Health Check" "PASSED"
    echo "Response: $response_body"
else
    print_status "AI Service Health Check" "FAILED"
    echo "HTTP Code: $http_code"
fi

# Test 2: Backend Health Check
echo
echo -e "${BLUE}[2/5] Testing Backend Health Check...${NC}"
echo "----------------------------------------"
response=$(curl -s -w "%{http_code}" "https://lifepattern-backend.onrender.com/health")
http_code="${response: -3}"
response_body="${response%???}"

if [ "$http_code" = "200" ]; then
    print_status "Backend Health Check" "PASSED"
    echo "Response: $response_body"
else
    print_status "Backend Health Check" "FAILED"
    echo "HTTP Code: $http_code"
fi

# Test 3: AI Service Enhanced Prediction
echo
echo -e "${BLUE}[3/5] Testing AI Service Enhanced Prediction...${NC}"
echo "-----------------------------------------------"
test_data='{
  "sleep_hours": 5.0,
  "meal_times": ["08:30", "13:00", "19:30"],
  "screen_time": 8.0,
  "exercise_duration": 0.3,
  "wake_up_time": "08:30",
  "bed_time": "01:00",
  "water_intake": 1.5,
  "stress_level": 7
}'

response=$(curl -s -w "%{http_code}" -X POST "https://lifepattern-ai-service.onrender.com/predict" \
  -H "Content-Type: application/json" \
  -d "$test_data")
http_code="${response: -3}"
response_body="${response%???}"

if [ "$http_code" = "200" ]; then
    print_status "AI Service Enhanced Prediction" "PASSED"
    echo "Response includes enhanced features:"
    if echo "$response_body" | grep -q "enhanced_recommendations"; then
        echo "  ✅ Enhanced recommendations present"
    else
        echo "  ❌ Enhanced recommendations missing"
    fi
    if echo "$response_body" | grep -q "behavioral_contexts"; then
        echo "  ✅ Behavioral contexts present"
    else
        echo "  ❌ Behavioral contexts missing"
    fi
else
    print_status "AI Service Enhanced Prediction" "FAILED"
    echo "HTTP Code: $http_code"
fi

# Test 4: AI Service API Documentation
echo
echo -e "${BLUE}[4/5] Testing AI Service API Documentation...${NC}"
echo "---------------------------------------------"
response=$(curl -s -w "%{http_code}" "https://lifepattern-ai-service.onrender.com/docs")
http_code="${response: -3}"

if [ "$http_code" = "200" ]; then
    print_status "AI Service API Documentation" "PASSED"
    echo "Documentation accessible at: https://lifepattern-ai-service.onrender.com/docs"
else
    print_status "AI Service API Documentation" "FAILED"
    echo "HTTP Code: $http_code"
fi

# Test 5: Backend API Endpoints
echo
echo -e "${BLUE}[5/5] Testing Backend API Endpoints...${NC}"
echo "--------------------------------------"
response=$(curl -s -w "%{http_code}" "https://lifepattern-backend.onrender.com/api/health")
http_code="${response: -3}"
response_body="${response%???}"

if [ "$http_code" = "200" ]; then
    print_status "Backend API Endpoints" "PASSED"
    echo "Response: $response_body"
else
    print_status "Backend API Endpoints" "FAILED"
    echo "HTTP Code: $http_code"
fi

echo
echo "========================================"
echo "Test Summary"
echo "========================================"
echo
echo "Service URLs:"
echo "- AI Service: https://lifepattern-ai-service.onrender.com"
echo "- Backend: https://lifepattern-backend.onrender.com"
echo
echo "Health Check URLs:"
echo "- AI Health: https://lifepattern-ai-service.onrender.com/health"
echo "- Backend Health: https://lifepattern-backend.onrender.com/health"
echo
echo "API Documentation:"
echo "- AI Docs: https://lifepattern-ai-service.onrender.com/docs"
echo
echo "========================================"
echo "Testing Complete!"
echo "========================================" 