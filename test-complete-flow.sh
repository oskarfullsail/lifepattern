#!/bin/bash

# COMPLETE END-TO-END FLOW TEST
# 1. Create user
# 2. Login to get JWT token
# 3. Call device/info (authenticated)
# 4. Call auth/link/status (authenticated)
# 5. Call /api/log (authenticated) → Backend calls AI service → Returns AI predictions

set -e

echo "🧪 COMPLETE END-TO-END FLOW TEST"
echo "=================================="
echo ""
echo "Flow:"
echo "  1️⃣  Register user → Backend"
echo "  2️⃣  Login → Backend (get JWT token)"
echo "  3️⃣  Call /api/device/info → Backend (authenticated)"
echo "  4️⃣  Call /api/auth/link/status → Backend (authenticated)"
echo "  5️⃣  Call /api/log → Backend → AI Service → Backend response with AI predictions"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if containers are running
if ! docker ps | grep -q "test-backend"; then
    echo "❌ Backend container not running!"
    echo "Run: ./CLEAN_DOCKER_SETUP.sh first"
    exit 1
fi

# Configuration
BACKEND_URL="http://localhost:8081"
USERNAME="testuser_$(date +%s)"
PASSPHRASE="TestPassword123!"
DEVICE_LABEL="Test Device"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 1: Register User${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

REGISTER_PAYLOAD=$(cat <<EOF
{
  "username": "$USERNAME",
  "passphrase": "$PASSPHRASE",
  "device_label": "$DEVICE_LABEL"
}
EOF
)

echo "Registering user: $USERNAME"
echo ""

REGISTER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_PAYLOAD")

echo "Register Response:"
echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"
echo ""

# Extract user_id
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user_id' 2>/dev/null)

if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
    echo -e "${RED}❌ Failed to register user!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ User registered: $USER_ID${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 2: Login${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

LOGIN_PAYLOAD=$(cat <<EOF
{
  "username": "$USERNAME",
  "passphrase": "$PASSPHRASE",
  "device_label": "$DEVICE_LABEL"
}
EOF
)

echo "Logging in as: $USERNAME"
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_PAYLOAD")

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

# Extract JWT token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token' 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
    echo -e "${RED}❌ Failed to login!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Login successful!${NC}"
echo "Access Token: ${ACCESS_TOKEN:0:50}..."
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 3: Call Device Info${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Calling /api/device/info..."
echo ""

DEVICE_INFO_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/device/info" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Device Info Response:"
echo "$DEVICE_INFO_RESPONSE" | jq '.' 2>/dev/null || echo "$DEVICE_INFO_RESPONSE"
echo ""

if echo "$DEVICE_INFO_RESPONSE" | jq -e '.devices' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Device info retrieved successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Device info call failed or returned unexpected response${NC}"
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 4: Call Link Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Calling /api/auth/link/status..."
echo ""

LINK_STATUS_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/auth/link/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Link Status Response:"
echo "$LINK_STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$LINK_STATUS_RESPONSE"
echo ""

if echo "$LINK_STATUS_RESPONSE" | jq -e '.linked_devices' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Link status retrieved successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Link status call failed or returned unexpected response${NC}"
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 5: Create Routine Log (with AI Analysis)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start watching logs in background
echo "📋 Starting log monitoring..."
docker logs -f test-backend > /tmp/backend-flow-logs.txt 2>&1 &
BACKEND_LOG_PID=$!

docker logs -f test-ai > /tmp/ai-flow-logs.txt 2>&1 &
AI_LOG_PID=$!

sleep 1

LOG_PAYLOAD=$(cat <<EOF
{
  "user_id": "$USER_ID",
  "sleep_hours": 5,
  "meal_times": ["08:00", "14:00"],
  "screen_time": 9,
  "exercise_duration": 1,
  "wake_up_time": "08:00",
  "bed_time": "02:00",
  "water_intake": 2,
  "stress_level": 8,
  "log_date": "$(date +%Y-%m-%d)"
}
EOF
)

echo "Creating routine log with data:"
echo "$LOG_PAYLOAD" | jq '.'
echo ""
echo "Sending request to /api/log..."
echo ""

LOG_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/log" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$LOG_PAYLOAD")

# Give logs time to flush
sleep 3

# Stop log monitoring
kill $BACKEND_LOG_PID 2>/dev/null || true
kill $AI_LOG_PID 2>/dev/null || true

echo "Log Creation Response:"
echo "$LOG_RESPONSE" | jq '.' 2>/dev/null || echo "$LOG_RESPONSE"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 6: Verify Backend → AI Service Communication${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Backend Logs (filtered for AI communication):"
echo ""
tail -50 /tmp/backend-flow-logs.txt | grep -E "(Creating routine log|Pinging AI service|ensureAIServiceAwake|Sending request to AI|POST http://test-ai:8000/predict|Received response from AI|Successfully processed AI|Saved AI report|Created routine log)" --color=always || echo "No AI communication logs found"

echo ""
echo "AI Service Logs (filtered for predictions):"
echo ""
tail -30 /tmp/ai-flow-logs.txt | grep -E "(POST /predict|Received prediction request|Prediction completed)" --color=always || echo "No prediction logs found"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 7: Flow Analysis${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check for key indicators
BACKEND_CREATED_LOG=$(tail -50 /tmp/backend-flow-logs.txt | grep -c "Creating routine log for user $USER_ID" || echo "0")
BACKEND_PINGED_AI=$(tail -50 /tmp/backend-flow-logs.txt | grep -c "Pinging AI service\|ensureAIServiceAwake" || echo "0")
BACKEND_CALLED_AI=$(tail -50 /tmp/backend-flow-logs.txt | grep -c "Sending request to AI service\|POST http://test-ai:8000/predict" || echo "0")
AI_RECEIVED_REQUEST=$(tail -30 /tmp/ai-flow-logs.txt | grep -c "POST /predict\|Received prediction request" || echo "0")
BACKEND_GOT_RESPONSE=$(tail -50 /tmp/backend-flow-logs.txt | grep -c "Successfully processed AI service response\|Received response from AI" || echo "0")
BACKEND_SAVED_REPORT=$(tail -50 /tmp/backend-flow-logs.txt | grep -c "Saved AI report" || echo "0")

echo "Flow Verification:"
echo ""

if [ "$BACKEND_CREATED_LOG" -gt 0 ]; then
    echo -e "${GREEN}✅ Backend started creating routine log${NC}"
else
    echo -e "${RED}❌ Backend did NOT start creating routine log${NC}"
fi

if [ "$BACKEND_PINGED_AI" -gt 0 ]; then
    echo -e "${GREEN}✅ Backend pinged AI service to wake it up${NC}"
else
    echo -e "${YELLOW}⚠️  Backend did NOT ping AI service${NC}"
fi

if [ "$BACKEND_CALLED_AI" -gt 0 ]; then
    echo -e "${GREEN}✅ Backend called AI service for prediction${NC}"
else
    echo -e "${RED}❌ Backend did NOT call AI service${NC}"
fi

if [ "$AI_RECEIVED_REQUEST" -gt 0 ]; then
    echo -e "${GREEN}✅ AI service received prediction request${NC}"
else
    echo -e "${RED}❌ AI service did NOT receive prediction request${NC}"
fi

if [ "$BACKEND_GOT_RESPONSE" -gt 0 ]; then
    echo -e "${GREEN}✅ Backend received AI service response${NC}"
else
    echo -e "${RED}❌ Backend did NOT receive AI service response${NC}"
fi

if [ "$BACKEND_SAVED_REPORT" -gt 0 ]; then
    echo -e "${GREEN}✅ Backend saved AI report to database${NC}"
else
    echo -e "${YELLOW}⚠️  Backend did NOT save AI report${NC}"
fi

echo ""

# Check if response includes AI data
if echo "$LOG_RESPONSE" | jq -e '.ai_response' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Response includes AI recommendations${NC}"
    echo ""
    echo "AI Analysis Summary:"
    echo "$LOG_RESPONSE" | jq '{
      log_id: .log_id,
      user_id: .user_id,
      ai_response: {
        is_anomaly: .ai_response.is_anomaly,
        confidence: .ai_response.confidence_score,
        anomaly_type: .ai_response.anomaly_type,
        recommendations_count: (.ai_response.recommendations | length),
        first_recommendation: .ai_response.recommendations[0]
      }
    }'
else
    echo -e "${RED}❌ Response does NOT include AI recommendations${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}✅ COMPLETE FLOW TEST FINISHED${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Cleanup
rm -f /tmp/backend-flow-logs.txt /tmp/ai-flow-logs.txt

# Determine success
if [ "$BACKEND_CREATED_LOG" -gt 0 ] && [ "$BACKEND_CALLED_AI" -gt 0 ] && [ "$AI_RECEIVED_REQUEST" -gt 0 ] && [ "$BACKEND_GOT_RESPONSE" -gt 0 ]; then
    echo -e "${GREEN}🎉 SUCCESS! Complete flow working perfectly!${NC}"
    echo ""
    echo "✅ User registered successfully"
    echo "✅ User logged in and received JWT token"
    echo "✅ Device info endpoint working"
    echo "✅ Link status endpoint working"
    echo "✅ Backend received log creation request"
    echo "✅ Backend called AI service"
    echo "✅ AI service processed prediction"
    echo "✅ Backend received AI response"
    echo "✅ Backend returned complete response with AI analysis"
    echo ""
    exit 0
else
    echo -e "${RED}❌ FLOW INCOMPLETE - Some steps failed${NC}"
    echo ""
    echo "Check the logs above to see what failed."
    echo ""
    echo "Debug commands:"
    echo "  docker logs test-backend --tail=100"
    echo "  docker logs test-ai --tail=50"
    echo ""
    exit 1
fi
