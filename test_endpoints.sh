#!/bin/bash

# Test script for LifePattern API endpoints
# Backend: https://lifepattern-backend.onrender.com
# AI Service: https://lifepattern-ai-service.onrender.com

BACKEND_URL="https://lifepattern-backend.onrender.com"
AI_SERVICE_URL="https://lifepattern-ai-service.onrender.com"
USERNAME="oskartest"
PASSWORD="Yathzee"

echo "🧪 Testing LifePattern API Endpoints"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Login to get JWT token
echo "📝 Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"${USERNAME}\", \"passphrase\": \"${PASSWORD}\"}")

echo "Login Response: $LOGIN_RESPONSE"
echo ""

# Extract access token (adjust based on actual response format)
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}❌ Failed to get access token. Response:${NC}"
  echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Login successful!${NC}"
echo "Access Token: ${ACCESS_TOKEN:0:50}..."
echo ""

# Step 2: Test AI Service Heartbeat (direct)
echo "💓 Step 2: Testing AI Service Heartbeat (direct)..."
HEARTBEAT_AI=$(curl -s -X GET "${AI_SERVICE_URL}/status/heartbeat")
echo "AI Service Heartbeat Response:"
echo "$HEARTBEAT_AI" | jq '.' 2>/dev/null || echo "$HEARTBEAT_AI"
echo ""

# Step 3: Test Backend Heartbeat endpoint
echo "💓 Step 3: Testing Backend Heartbeat endpoint..."
HEARTBEAT_BACKEND=$(curl -s -X GET "${BACKEND_URL}/api/v1/ai/heartbeat" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")
echo "Backend Heartbeat Response:"
echo "$HEARTBEAT_BACKEND" | jq '.' 2>/dev/null || echo "$HEARTBEAT_BACKEND"
echo ""

# Step 4: Test Weekly Summary endpoint
echo "📊 Step 4: Testing Weekly Summary endpoint..."
END_DATE=$(date +%Y-%m-%d)  # Today's date
WEEKLY_SUMMARY=$(curl -s -X GET "${BACKEND_URL}/api/v1/routines/week-summary?endDate=${END_DATE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")
echo "Weekly Summary Response:"
echo "$WEEKLY_SUMMARY" | jq '.' 2>/dev/null || echo "$WEEKLY_SUMMARY"
echo ""

# Step 5: Test Daily Analysis endpoint
echo "📈 Step 5: Testing Daily Analysis endpoint..."
DAILY_ANALYSIS=$(curl -s -X POST "${BACKEND_URL}/api/v1/routines/analyze-day" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "'${END_DATE}'",
    "sleepHours": 7.5,
    "bedtime": "22:30",
    "wakeTime": "06:30",
    "steps": 8500,
    "workoutMinutes": 45,
    "screenTimeMinutes": 180,
    "meals": {
      "breakfast": true,
      "lunch": true,
      "dinner": true
    },
    "mood": 4,
    "stressLevel": 3,
    "goalContext": {
      "sleepTargetHours": 7.5,
      "dailyStepTarget": 8000,
      "maxScreenTimeMinutes": 180
    },
    "historyWindowDays": 14
  }')
echo "Daily Analysis Response:"
echo "$DAILY_ANALYSIS" | jq '.' 2>/dev/null || echo "$DAILY_ANALYSIS"
echo ""

echo "======================================"
echo -e "${GREEN}✅ Testing complete!${NC}"

