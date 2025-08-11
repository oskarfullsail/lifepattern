#!/bin/bash

# LifePattern Services Test Script
echo "🧪 Testing LifePattern Services..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Testing $name... "
    
    if curl -f -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

# Test AI Service
echo ""
echo "🤖 Testing AI Service..."
test_endpoint "AI Service Health" "http://localhost:8000/health"

# Test AI Service Prediction
echo ""
echo "🧠 Testing AI Service Prediction..."
PREDICTION_RESPONSE=$(curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_hours": 8.0,
    "meal_times": ["07:30", "12:00", "18:30"],
    "screen_time": 4.5,
    "exercise_duration": 1.0,
    "wake_up_time": "07:00",
    "bed_time": "23:00",
    "water_intake": 2.5,
    "stress_level": 4
  }')

if echo "$PREDICTION_RESPONSE" | grep -q "is_anomaly"; then
    echo -e "${GREEN}✅ AI Prediction Working${NC}"
    echo "Response: $PREDICTION_RESPONSE"
else
    echo -e "${RED}❌ AI Prediction Failed${NC}"
fi

# Test Backend
echo ""
echo "⚙️  Testing Backend..."
test_endpoint "Backend Health" "http://localhost:8080/health"

# Test Backend Routine Log Creation
echo ""
echo "📝 Testing Backend Routine Log Creation..."
ROUTINE_RESPONSE=$(curl -s -X POST http://localhost:8080/log \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_123",
    "sleep_hours": 7.5,
    "meal_times": ["07:30", "12:00", "18:30"],
    "screen_time": 4.5,
    "exercise_duration": 1.0,
    "wake_up_time": "07:00",
    "bed_time": "23:00",
    "water_intake": 2.5,
    "stress_level": 4,
    "log_date": "2024-01-15"
  }')

if echo "$ROUTINE_RESPONSE" | grep -q "log_id"; then
    echo -e "${GREEN}✅ Backend Routine Log Working${NC}"
    echo "Response: $ROUTINE_RESPONSE"
else
    echo -e "${RED}❌ Backend Routine Log Failed${NC}"
fi

# Test Backend Insights
echo ""
echo "📊 Testing Backend Insights..."
INSIGHTS_RESPONSE=$(curl -s "http://localhost:8080/insights?log_id=1")

if echo "$INSIGHTS_RESPONSE" | grep -q "routine_log"; then
    echo -e "${GREEN}✅ Backend Insights Working${NC}"
else
    echo -e "${YELLOW}⚠️  Backend Insights (might be empty if no data)${NC}"
fi

echo ""
echo "🎉 Testing Complete!"
echo ""
echo "📋 Summary:"
echo "  - AI Service: http://localhost:8000"
echo "  - Backend API: http://localhost:8080"
echo "  - Database: localhost:5432"
echo ""
echo "🚀 Ready for frontend integration!" 