#!/bin/bash

# Simple container testing script
set -e

echo "🧪 Testing Backend ↔ AI Service Communication"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Clean up
echo "🧹 Cleaning up old containers..."
docker compose -f docker-compose.test.yml down -v 2>/dev/null || true
docker rm -f test-db test-ai-service test-backend 2>/dev/null || true
echo ""

# Step 2: Build and start
echo "🏗️  Building and starting containers..."
docker compose -f docker-compose.test.yml up -d --build

# Step 3: Wait for services
echo ""
echo "⏳ Waiting for services to be ready (30 seconds)..."
sleep 30

# Step 4: Check container status
echo ""
echo "📊 Container Status:"
docker compose -f docker-compose.test.yml ps

# Step 5: Test AI Service
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Testing AI Service (localhost:8001)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Health check:"
curl -s http://localhost:8001/health | jq '.' || echo "Failed"

echo ""
echo "Prediction test:"
curl -s -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_hours": 6,
    "meal_times": ["08:00"],
    "screen_time": 8,
    "exercise_duration": 0.5,
    "wake_up_time": "08:00",
    "bed_time": "02:00",
    "water_intake": 1,
    "stress_level": 8
  }' | jq '.is_anomaly, .confidence_score, .recommendations[0]' || echo "Failed"

# Step 6: Test Backend
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Testing Backend (localhost:8081)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Health check:"
curl -s http://localhost:8081/health | jq '.' || echo "Failed"

# Step 7: Test from inside backend container
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Testing Backend → AI Service (internal)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Backend can reach AI service:"
docker exec test-backend curl -s http://test-ai:8000/health | head -c 100 || echo "Failed"

echo ""
echo ""
echo "Backend can call prediction:"
docker exec test-backend curl -s -X POST http://test-ai:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_hours": 6,
    "meal_times": ["08:00"],
    "screen_time": 8,
    "exercise_duration": 0.5,
    "wake_up_time": "08:00",
    "bed_time": "02:00",
    "water_intake": 1,
    "stress_level": 8
  }' | head -c 200 || echo "Failed"

# Step 8: Check environment variables
echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Environment Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "AI_SERVICE_URL in backend:"
docker exec test-backend printenv AI_SERVICE_URL

# Step 9: Check logs
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Service Logs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "AI Service logs:"
docker compose -f docker-compose.test.yml logs test-ai --tail=20

echo ""
echo "Backend logs:"
docker compose -f docker-compose.test.yml logs test-backend --tail=20

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Testing Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To view live logs:"
echo "  docker compose -f docker-compose.test.yml logs -f test-ai"
echo "  docker compose -f docker-compose.test.yml logs -f test-backend"
echo ""
echo "To stop containers:"
echo "  docker compose -f docker-compose.test.yml down"

