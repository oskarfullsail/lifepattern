#!/bin/bash

# COMPREHENSIVE LOCAL INTEGRATION TESTING
# Tests backend ↔ AI service communication locally

set -e

echo "🚀 LifePattern Local Integration Testing"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Function to make HTTP requests with proper error handling
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local expected_status=$4
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    # Split response and status code
    body=$(echo "$response" | head -n -1)
    status=$(echo "$response" | tail -n 1)
    
    echo "$status|$body"
}

# ==========================================
# STEP 1: CHECK DOCKER ENVIRONMENT
# ==========================================
print_section "STEP 1: Checking Docker Environment"

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
else
    print_success "Docker is installed"
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
else
    print_success "Docker Compose is installed"
fi

# ==========================================
# STEP 2: START SERVICES
# ==========================================
print_section "STEP 2: Starting Docker Services"

print_info "Stopping any existing containers..."
docker-compose down -v 2>/dev/null || true

print_info "Building and starting services..."
docker-compose up -d --build

print_info "Waiting for services to be healthy..."
sleep 10

# Check if containers are running
if [ "$(docker ps -q -f name=lifepattern-postgres)" ]; then
    print_success "PostgreSQL is running"
else
    print_error "PostgreSQL failed to start"
    docker-compose logs postgres
    exit 1
fi

if [ "$(docker ps -q -f name=lifepattern-ai-service)" ]; then
    print_success "AI Service is running"
else
    print_error "AI Service failed to start"
    docker-compose logs ai-service
    exit 1
fi

if [ "$(docker ps -q -f name=lifepattern-backend)" ]; then
    print_success "Backend is running"
else
    print_error "Backend failed to start"
    docker-compose logs backend
    exit 1
fi

# Wait for health checks
print_info "Waiting for services to become healthy (60s)..."
sleep 60

# ==========================================
# STEP 3: TEST AI SERVICE DIRECTLY
# ==========================================
print_section "STEP 3: Testing AI Service (Direct)"

print_info "Testing AI Service Health Endpoint..."
result=$(make_request "GET" "http://localhost:8000/health" "" "200")
status=$(echo "$result" | cut -d'|' -f1)
body=$(echo "$result" | cut -d'|' -f2-)

if [ "$status" = "200" ]; then
    print_success "AI Service health check passed"
    echo "Response: $body"
else
    print_error "AI Service health check failed (status: $status)"
    echo "Response: $body"
fi

print_info "Testing AI Service Prediction Endpoint..."
test_data='{
  "sleep_hours": 7.5,
  "meal_times": ["08:00", "12:30", "19:00"],
  "screen_time": 5.0,
  "exercise_duration": 1.5,
  "wake_up_time": "07:00",
  "bed_time": "23:00",
  "water_intake": 2.5,
  "stress_level": 5
}'

result=$(make_request "POST" "http://localhost:8000/predict" "$test_data" "200")
status=$(echo "$result" | cut -d'|' -f1)
body=$(echo "$result" | cut -d'|' -f2-)

if [ "$status" = "200" ]; then
    print_success "AI Service prediction endpoint passed"
    echo "Response preview: $(echo "$body" | head -c 200)..."
    
    # Check for expected fields
    if echo "$body" | grep -q "is_anomaly"; then
        print_success "Response contains 'is_anomaly'"
    else
        print_error "Response missing 'is_anomaly'"
    fi
    
    if echo "$body" | grep -q "recommendations"; then
        print_success "Response contains 'recommendations'"
    else
        print_error "Response missing 'recommendations'"
    fi
else
    print_error "AI Service prediction failed (status: $status)"
    echo "Response: $body"
fi

# ==========================================
# STEP 4: TEST BACKEND DIRECTLY
# ==========================================
print_section "STEP 4: Testing Backend (Direct)"

print_info "Testing Backend Health Endpoint..."
result=$(make_request "GET" "http://localhost:8080/health" "" "200")
status=$(echo "$result" | cut -d'|' -f1)
body=$(echo "$result" | cut -d'|' -f2-)

if [ "$status" = "200" ]; then
    print_success "Backend health check passed"
    echo "Response: $body"
else
    print_error "Backend health check failed (status: $status)"
    echo "Response: $body"
fi

# ==========================================
# STEP 5: TEST BACKEND → AI SERVICE COMMUNICATION
# ==========================================
print_section "STEP 5: Testing Backend → AI Service Communication"

print_info "Creating test user and getting auth token..."

# Register user
register_data='{
  "device_id": "test-device-123",
  "device_name": "Test Device",
  "platform": "web"
}'

result=$(make_request "POST" "http://localhost:8080/api/auth/register/init" "$register_data" "")
status=$(echo "$result" | cut -d'|' -f1)
body=$(echo "$result" | cut -d'|' -f2-)

if [ "$status" = "201" ] || [ "$status" = "200" ]; then
    print_success "User registration successful"
    USER_ID=$(echo "$body" | grep -o '"user_id":"[^"]*"' | cut -d'"' -f4)
    print_info "User ID: $USER_ID"
else
    print_warning "User registration failed (might already exist) - status: $status"
    # Try to extract user_id anyway
    USER_ID=$(echo "$body" | grep -o '"user_id":"[^"]*"' | cut -d'"' -f4 | head -n1)
    if [ -z "$USER_ID" ]; then
        # Use a test UUID
        USER_ID="550e8400-e29b-41d4-a716-446655440000"
        print_info "Using test User ID: $USER_ID"
    fi
fi

# Get auth token (simplified - normally would complete WebAuthn flow)
# For testing, we'll create a log without auth and check backend logs
print_info "Creating routine log (this should trigger AI service call)..."

log_data="{
  \"user_id\": \"$USER_ID\",
  \"sleep_hours\": 6.5,
  \"meal_times\": [\"08:00\", \"13:00\", \"19:30\"],
  \"screen_time\": 5.5,
  \"exercise_duration\": 1.0,
  \"wake_up_time\": \"07:30\",
  \"bed_time\": \"23:30\",
  \"water_intake\": 2.0,
  \"stress_level\": 6,
  \"log_date\": \"$(date +%Y-%m-%d)\"
}"

# Note: This endpoint requires auth, so we'll check backend logs instead
print_warning "Log creation endpoint requires authentication"
print_info "Checking backend logs for AI service communication..."

# ==========================================
# STEP 6: CHECK LOGS FOR COMMUNICATION
# ==========================================
print_section "STEP 6: Checking Docker Logs for Communication"

print_info "Checking AI Service logs for incoming requests..."
ai_logs=$(docker-compose logs ai-service --tail=50)

echo "━━━ AI Service Logs (last 50 lines) ━━━"
echo "$ai_logs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if echo "$ai_logs" | grep -q "POST /predict"; then
    print_success "AI Service received prediction requests!"
else
    print_warning "No prediction requests found in AI Service logs"
fi

print_info "Checking Backend logs for AI service calls..."
backend_logs=$(docker-compose logs backend --tail=50)

echo "━━━ Backend Logs (last 50 lines) ━━━"
echo "$backend_logs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if echo "$backend_logs" | grep -q "Sending routine data to AI service"; then
    print_success "Backend attempted to call AI service!"
else
    print_error "Backend did not attempt to call AI service"
fi

if echo "$backend_logs" | grep -q "AI service is awake and ready"; then
    print_success "Backend successfully pinged AI service!"
else
    print_warning "Backend wake-up ping not found in logs"
fi

if echo "$backend_logs" | grep -q "Successfully processed AI service response"; then
    print_success "Backend successfully received AI response!"
else
    print_error "Backend did not successfully receive AI response"
fi

# ==========================================
# STEP 7: DIRECT BACKEND CONTAINER TEST
# ==========================================
print_section "STEP 7: Testing from Inside Backend Container"

print_info "Testing AI service connectivity from backend container..."

# Test from inside backend container
backend_to_ai=$(docker exec lifepattern-backend curl -s -o /dev/null -w "%{http_code}" http://ai-service:8000/health 2>/dev/null || echo "000")

if [ "$backend_to_ai" = "200" ]; then
    print_success "Backend container can reach AI service (status: $backend_to_ai)"
else
    print_error "Backend container CANNOT reach AI service (status: $backend_to_ai)"
fi

# Test prediction endpoint from backend
print_info "Testing AI prediction from backend container..."
prediction_test=$(docker exec lifepattern-backend curl -s -X POST http://ai-service:8000/predict \
    -H "Content-Type: application/json" \
    -d "$test_data" 2>/dev/null | head -c 100)

if [ -n "$prediction_test" ]; then
    print_success "Backend can call AI prediction endpoint"
    echo "Response preview: $prediction_test..."
else
    print_error "Backend cannot call AI prediction endpoint"
fi

# ==========================================
# STEP 8: CHECK ENVIRONMENT VARIABLES
# ==========================================
print_section "STEP 8: Checking Environment Variables"

print_info "Checking backend AI_SERVICE_URL..."
ai_url=$(docker exec lifepattern-backend printenv AI_SERVICE_URL 2>/dev/null || echo "NOT SET")

if [ "$ai_url" = "http://ai-service:8000" ]; then
    print_success "Backend AI_SERVICE_URL is correct: $ai_url"
else
    print_error "Backend AI_SERVICE_URL is incorrect: $ai_url (should be http://ai-service:8000)"
fi

# ==========================================
# SUMMARY
# ==========================================
print_section "TEST SUMMARY"

echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    print_success "ALL TESTS PASSED! 🎉"
    echo ""
    echo "Your local environment is working correctly!"
    echo ""
    echo "Next steps:"
    echo "1. Check logs above for any communication issues"
    echo "2. Compare with Render logs to identify differences"
    echo "3. Use 'docker-compose logs -f' to watch live logs"
    exit 0
else
    print_error "SOME TESTS FAILED"
    echo ""
    echo "To debug:"
    echo "1. Check logs above for error details"
    echo "2. Run: docker-compose logs ai-service"
    echo "3. Run: docker-compose logs backend"
    echo "4. Run: docker-compose ps (check container status)"
    exit 1
fi

