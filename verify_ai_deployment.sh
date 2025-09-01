#!/bin/bash

# Verify AI Service Deployment on Render
echo "🔍 Verifying AI Service Deployment on Render"
echo "============================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to print status
print_status() {
    local message="$1"
    local status="$2"
    
    if [ "$status" = "SUCCESS" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "ERROR" ]; then
        echo -e "${RED}❌ $message${NC}"
    elif [ "$status" = "INFO" ]; then
        echo -e "${BLUE}ℹ️  $message${NC}"
    elif [ "$status" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    fi
}

# AI Service URL
AI_SERVICE_URL="https://lifepattern-ai-service.onrender.com"

echo -e "\n${BLUE}Testing AI Service at: $AI_SERVICE_URL${NC}"

# Test 1: Health Check
echo -e "\n${BLUE}Test 1: Health Check${NC}"
print_status "Testing AI service health..." "INFO"

health_response=$(curl -s -w "%{http_code}" "$AI_SERVICE_URL/health" 2>/dev/null)
http_code="${health_response: -3}"
response_body="${health_response%???}"

if [ "$http_code" = "200" ]; then
    print_status "AI service is responding (HTTP 200)" "SUCCESS"
    if echo "$response_body" | grep -q '"status":"healthy"'; then
        print_status "AI service is healthy" "SUCCESS"
        echo "   Response: $response_body"
    else
        print_status "AI service health check failed" "ERROR"
        echo "   Response: $response_body"
    fi
else
    print_status "AI service is not responding (HTTP $http_code)" "ERROR"
    echo "   Response: $response_body"
fi

# Test 2: Enhanced Features
echo -e "\n${BLUE}Test 2: Enhanced Features${NC}"
print_status "Testing enhanced AI features..." "INFO"

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

prediction_response=$(curl -s -w "%{http_code}" -X POST "$AI_SERVICE_URL/predict" \
  -H "Content-Type: application/json" \
  -d "$test_data" 2>/dev/null)

http_code="${prediction_response: -3}"
response_body="${prediction_response%???}"

if [ "$http_code" = "200" ]; then
    print_status "Prediction endpoint is working (HTTP 200)" "SUCCESS"
    
    # Check for enhanced features
    if echo "$response_body" | grep -q '"enhanced_recommendations"'; then
        print_status "Enhanced recommendations present" "SUCCESS"
        enhanced_count=$(echo "$response_body" | jq '.enhanced_recommendations | length' 2>/dev/null || echo "0")
        echo "   📊 Found $enhanced_count enhanced recommendations"
    else
        print_status "Enhanced recommendations missing" "ERROR"
    fi
    
    if echo "$response_body" | grep -q '"behavioral_contexts"'; then
        print_status "Behavioral contexts present" "SUCCESS"
        context_count=$(echo "$response_body" | jq '.behavioral_contexts | length' 2>/dev/null || echo "0")
        echo "   📊 Found $context_count behavioral contexts"
    else
        print_status "Behavioral contexts missing" "ERROR"
    fi
    
    if echo "$response_body" | grep -q '"drift_analysis"'; then
        print_status "Drift analysis present" "SUCCESS"
    else
        print_status "Drift analysis missing" "WARNING"
    fi
    
    # Show sample response
    echo -e "\n${BLUE}Sample Response:${NC}"
    echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
    
else
    print_status "Prediction endpoint failed (HTTP $http_code)" "ERROR"
    echo "   Response: $response_body"
fi

# Test 3: OpenAPI Documentation
echo -e "\n${BLUE}Test 3: API Documentation${NC}"
print_status "Testing API documentation..." "INFO"

docs_response=$(curl -s -w "%{http_code}" "$AI_SERVICE_URL/docs" 2>/dev/null)
http_code="${docs_response: -3}"

if [ "$http_code" = "200" ]; then
    print_status "API documentation is accessible" "SUCCESS"
    echo "   📚 Docs URL: $AI_SERVICE_URL/docs"
else
    print_status "API documentation not accessible (HTTP $http_code)" "WARNING"
fi

# Test 4: OpenAPI Schema
echo -e "\n${BLUE}Test 4: OpenAPI Schema${NC}"
print_status "Testing OpenAPI schema..." "INFO"

schema_response=$(curl -s -w "%{http_code}" "$AI_SERVICE_URL/openapi.json" 2>/dev/null)
http_code="${schema_response: -3}"
schema_body="${schema_response%???}"

if [ "$http_code" = "200" ]; then
    print_status "OpenAPI schema is accessible" "SUCCESS"
    
    # Check available endpoints
    endpoints=$(echo "$schema_body" | jq '.paths | keys' 2>/dev/null || echo "[]")
    echo "   🔗 Available endpoints: $endpoints"
else
    print_status "OpenAPI schema not accessible (HTTP $http_code)" "WARNING"
fi

echo -e "\n${BLUE}==================================================${NC}"
echo -e "${BLUE}🎯 AI Service Deployment Verification Summary${NC}"
echo -e "${BLUE}==================================================${NC}"

if [ "$http_code" = "200" ] && echo "$response_body" | grep -q '"enhanced_recommendations"'; then
    echo -e "${GREEN}🎉 AI Service Deployment Successful!${NC}"
    echo -e "   ✅ Service is healthy and responding"
    echo -e "   ✅ Enhanced features are working"
    echo -e "   ✅ Ready for backend integration"
    
    echo -e "\n${BLUE}🔗 Service URLs:${NC}"
    echo -e "   Health: $AI_SERVICE_URL/health"
    echo -e "   Predict: $AI_SERVICE_URL/predict"
    echo -e "   Docs: $AI_SERVICE_URL/docs"
    
    echo -e "\n${BLUE}🚀 Next Steps:${NC}"
    echo -e "   1. ✅ AI Service deployed successfully"
    echo -e "   2. 🔄 Deploy backend with updated AI_SERVICE_URL"
    echo -e "   3. 🔗 Test full integration"
    
else
    echo -e "${RED}❌ AI Service Deployment Issues Detected${NC}"
    echo -e "   ⚠️  Check Render dashboard for deployment status"
    echo -e "   ⚠️  Verify the service is running"
    echo -e "   ⚠️  Check logs for any errors"
    
    echo -e "\n${BLUE}🔍 Troubleshooting:${NC}"
    echo -e "   1. Check Render dashboard: https://dashboard.render.com"
    echo -e "   2. Check service logs in Render"
    echo -e "   3. Verify environment variables"
    echo -e "   4. Check if the service is starting properly"
fi

echo -e "\n${BLUE}📋 Manual Test Commands:${NC}"
echo "curl $AI_SERVICE_URL/health"
echo "curl -X POST $AI_SERVICE_URL/predict \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '$test_data'" 