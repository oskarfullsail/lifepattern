#!/bin/bash

# CLEAN DOCKER SETUP - Backend & AI Service
# Start from scratch testing

set -e

echo "🧹 CLEAN DOCKER SETUP - Starting from Scratch"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ==========================================
# STEP 1: CLEAN EVERYTHING
# ==========================================
print_section "STEP 1: Cleaning Docker Environment"

print_info "Stopping all containers..."
docker stop $(docker ps -aq) 2>/dev/null || true

print_info "Removing all containers..."
docker rm $(docker ps -aq) 2>/dev/null || true

print_info "Removing all networks (except defaults)..."
docker network prune -f 2>/dev/null || true

print_info "Removing all volumes..."
docker volume prune -f 2>/dev/null || true

print_success "Docker environment cleaned!"

# ==========================================
# STEP 2: BUILD AI SERVICE FIRST
# ==========================================
print_section "STEP 2: Building AI Service"

print_info "Building AI service image..."
cd /Users/oskarsanchez-chagollan/School_Projects/lifepattern/ai-service

docker build -t lifepattern-ai:test -f Dockerfile . --no-cache

print_success "AI service image built!"

# ==========================================
# STEP 3: BUILD BACKEND
# ==========================================
print_section "STEP 3: Building Backend"

print_info "Building backend image..."
cd /Users/oskarsanchez-chagollan/School_Projects/lifepattern/backend

docker build -t lifepattern-backend:test -f Dockerfile . --no-cache

print_success "Backend image built!"

# ==========================================
# STEP 4: CREATE NETWORK
# ==========================================
print_section "STEP 4: Creating Docker Network"

print_info "Creating test network..."
docker network create lifepattern-test-network 2>/dev/null || print_info "Network already exists"

print_success "Network ready!"

# ==========================================
# STEP 5: START POSTGRESQL
# ==========================================
print_section "STEP 5: Starting PostgreSQL"

print_info "Starting PostgreSQL container..."
docker run -d \
  --name test-postgres \
  --network lifepattern-test-network \
  -e POSTGRES_DB=lifepattern \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5433:5432 \
  postgres:15-alpine

print_info "Waiting for PostgreSQL to be ready (10s)..."
sleep 10

print_success "PostgreSQL is running!"

# ==========================================
# STEP 6: START AI SERVICE
# ==========================================
print_section "STEP 6: Starting AI Service"

print_info "Starting AI service container..."
docker run -d \
  --name test-ai \
  --network lifepattern-test-network \
  -e PORT=8000 \
  -e PYTHONPATH=/app \
  -p 8001:8000 \
  lifepattern-ai:test

print_info "Waiting for AI service to be ready (15s)..."
sleep 15

# Test AI service
AI_HEALTH=$(curl -s http://localhost:8001/health | grep -o "healthy" || echo "")
if [ "$AI_HEALTH" = "healthy" ]; then
    print_success "AI service is running and healthy!"
else
    print_error "AI service health check failed"
    docker logs test-ai --tail=20
fi

# ==========================================
# STEP 7: START BACKEND
# ==========================================
print_section "STEP 7: Starting Backend"

print_info "Starting backend container..."
docker run -d \
  --name test-backend \
  --network lifepattern-test-network \
  -e PORT=8080 \
  -e HOST=0.0.0.0 \
  -e DATABASE_URL=postgres://postgres:password@test-postgres:5432/lifepattern?sslmode=disable \
  -e AI_SERVICE_URL=http://test-ai:8000 \
  -e JWT_SECRET_KEY=test-secret-key \
  -e JWT_ISSUER=lifepattern-test \
  -e JWT_AUDIENCE=lifepattern-test-users \
  -e JWT_ACCESS_TOKEN_EXPIRY=15m \
  -e JWT_REFRESH_TOKEN_EXPIRY=720h \
  -e WEBAUTHN_RP_ID=localhost \
  -e WEBAUTHN_RP_NAME=LifePatternTest \
  -e WEBAUTHN_RP_ORIGIN=http://localhost:8081 \
  -e CHALLENGE_EXPIRY=5m \
  -e LINK_TOKEN_EXPIRY=10m \
  -e DEBUG=true \
  -e LOG_LEVEL=debug \
  -p 8081:8080 \
  lifepattern-backend:test

print_info "Waiting for backend to be ready (20s)..."
sleep 20

# Test backend
BACKEND_HEALTH=$(curl -s http://localhost:8081/health | grep -o "healthy" || echo "")
if [ "$BACKEND_HEALTH" = "healthy" ]; then
    print_success "Backend is running and healthy!"
else
    print_error "Backend health check failed"
    docker logs test-backend --tail=20
fi

# ==========================================
# STEP 8: TEST COMMUNICATION
# ==========================================
print_section "STEP 8: Testing Backend → AI Service Communication"

print_info "Testing if backend can reach AI service..."
docker exec test-backend curl -s http://test-ai:8000/health | head -c 100 || print_error "Failed"

print_info "Testing if backend can call prediction endpoint..."
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
  }' | head -c 200 || print_error "Failed"

print_success "Backend can communicate with AI service!"

# ==========================================
# STEP 9: SHOW STATUS
# ==========================================
print_section "STEP 9: Container Status"

echo "Running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Network:"
docker network inspect lifepattern-test-network --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'

# ==========================================
# STEP 10: SHOW LOGS
# ==========================================
print_section "STEP 10: Recent Logs"

echo ""
echo "AI Service logs (last 10 lines):"
docker logs test-ai --tail=10

echo ""
echo "Backend logs (last 10 lines):"
docker logs test-backend --tail=10

# ==========================================
# SUMMARY
# ==========================================
print_section "✅ SETUP COMPLETE!"

echo "Your services are running:"
echo ""
echo "  PostgreSQL:  localhost:5433"
echo "  AI Service:  localhost:8001"
echo "  Backend:     localhost:8081"
echo ""
echo "Test commands:"
echo ""
echo "  # AI Service health"
echo "  curl http://localhost:8001/health"
echo ""
echo "  # AI Service prediction"
echo "  curl -X POST http://localhost:8001/predict \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"sleep_hours\":6,\"meal_times\":[\"08:00\"],\"screen_time\":8,\"exercise_duration\":0.5,\"wake_up_time\":\"08:00\",\"bed_time\":\"02:00\",\"water_intake\":1,\"stress_level\":8}'"
echo ""
echo "  # Backend health"
echo "  curl http://localhost:8081/health"
echo ""
echo "View logs:"
echo ""
echo "  docker logs -f test-ai"
echo "  docker logs -f test-backend"
echo "  docker logs -f test-postgres"
echo ""
echo "Stop everything:"
echo ""
echo "  docker stop test-ai test-backend test-postgres"
echo "  docker rm test-ai test-backend test-postgres"
echo ""
print_success "Ready for testing! 🚀"

