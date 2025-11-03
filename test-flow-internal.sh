#!/bin/bash

# TEST COMPLETE FLOW - Internal Container Test
# This tests from inside the backend container to bypass auth

echo "🧪 TESTING COMPLETE FLOW (Internal)"
echo "===================================="
echo ""

# Test data
TEST_DATA='{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "sleep_hours": 5.5,
  "meal_times": ["08:00", "14:00"],
  "screen_time": 9.0,
  "exercise_duration": 0.5,
  "wake_up_time": "08:00",
  "bed_time": "02:00",
  "water_intake": 1.0,
  "stress_level": 8,
  "log_date": "'$(date +%Y-%m-%d)'"
}'

echo "📊 Test Data:"
echo "$TEST_DATA" | jq '.'
echo ""

echo "🔍 BEFORE - Checking current logs..."
echo ""
echo "Backend (last 5 lines):"
docker logs test-backend --tail=5
echo ""
echo "AI Service (last 5 lines):"
docker logs test-ai --tail=5
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 SENDING REQUEST..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test directly to AI service first to confirm it works
echo "Step 1: Testing AI Service directly..."
AI_RESPONSE=$(docker exec test-backend curl -s -X POST http://test-ai:8000/predict \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA")

echo "AI Service Response:"
echo "$AI_RESPONSE" | jq '.' | head -20
echo ""

# Now let's check if we can hit the backend directly
echo "Step 2: Testing backend health endpoint..."
HEALTH=$(docker exec test-backend curl -s http://localhost:8080/health)
echo "Backend health: $HEALTH"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 AFTER - Checking logs for communication..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

sleep 2

echo "Backend Logs (last 30 lines - filtered for key events):"
docker logs test-backend --tail=30 | grep -E "(Creating routine log|Pinging AI service|Sending request|Received response|Successfully processed|POST /api/log)" --color=always || echo "No matching logs"

echo ""
echo "AI Service Logs (last 20 lines - filtered for predictions):"
docker logs test-ai --tail=20 | grep -E "(POST /predict|Received prediction|Prediction completed)" --color=always || echo "No matching logs"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TEST COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check AI service logs for POST /predict
if docker logs test-ai --tail=20 | grep -q "POST /predict"; then
    echo "✅ AI Service received prediction request!"
else
    echo "⚠️  AI Service did not receive prediction request"
fi

echo ""
echo "Note: The /api/log endpoint requires authentication."
echo "To test the complete flow with backend, you need:"
echo "1. A valid JWT token, OR"
echo "2. Disable auth middleware for testing, OR"
echo "3. Use the health check + direct AI service test (as done above)"

