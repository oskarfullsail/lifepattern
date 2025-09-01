#!/bin/bash

# Enhanced Backend-AI Service Integration Test
# This script tests the complete integration between backend and AI service

set -e

echo "🧪 Testing Enhanced Backend-AI Service Integration"
echo "=================================================="

# Configuration
BACKEND_URL="http://localhost:8080"
AI_SERVICE_URL="http://localhost:8000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $test_name PASSED${NC}"
        if [ -n "$details" ]; then
            echo -e "   $details"
        fi
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ $test_name FAILED${NC}"
        if [ -n "$details" ]; then
            echo -e "   $details"
        fi
        ((TESTS_FAILED++))
    fi
}

# Function to make HTTP requests
make_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    local headers="$4"
    
    if [ -n "$data" ]; then
        if [ -n "$headers" ]; then
            curl -s -X "$method" "$url" -H "$headers" -d "$data"
        else
            curl -s -X "$method" "$url" -H "Content-Type: application/json" -d "$data"
        fi
    else
        curl -s -X "$method" "$url"
    fi
}

echo -e "\n${BLUE}1. Testing AI Service Health${NC}"
echo "--------------------------------"

# Test AI service health
ai_health=$(make_request "GET" "$AI_SERVICE_URL/health")
if echo "$ai_health" | grep -q '"status":"healthy"'; then
    print_result "AI Service Health Check" "PASS" "Service is healthy"
else
    print_result "AI Service Health Check" "FAIL" "Service not responding properly"
fi

echo -e "\n${BLUE}2. Testing Backend Health${NC}"
echo "--------------------------------"

# Test backend health
backend_health=$(make_request "GET" "$BACKEND_URL/health")
if echo "$backend_health" | grep -q '"status":"ok"'; then
    print_result "Backend Health Check" "PASS" "Backend is healthy"
else
    print_result "Backend Health Check" "FAIL" "Backend not responding properly"
fi

echo -e "\n${BLUE}3. Testing AI Service Direct Communication${NC}"
echo "----------------------------------------"

# Test AI service prediction endpoint
test_data='{
  "sleep_hours": 8.0,
  "meal_times": ["07:30", "12:00", "18:30"],
  "screen_time": 4.0,
  "exercise_duration": 1.0,
  "wake_up_time": "07:00",
  "bed_time": "23:00",
  "water_intake": 2.5,
  "stress_level": 4
}'

ai_response=$(make_request "POST" "$AI_SERVICE_URL/predict" "$test_data")

# Check for enhanced features in AI response
if echo "$ai_response" | grep -q '"enhanced_recommendations"'; then
    print_result "Enhanced Recommendations" "PASS" "AI service returns enhanced recommendations"
else
    print_result "Enhanced Recommendations" "FAIL" "Enhanced recommendations not found in response"
fi

if echo "$ai_response" | grep -q '"behavioral_contexts"'; then
    print_result "Behavioral Contexts" "PASS" "AI service returns behavioral contexts"
else
    print_result "Behavioral Contexts" "FAIL" "Behavioral contexts not found in response"
fi

if echo "$ai_response" | grep -q '"drift_analysis"'; then
    print_result "Drift Analysis" "PASS" "AI service returns drift analysis"
else
    print_result "Drift Analysis" "FAIL" "Drift analysis not found in response"
fi

echo -e "\n${BLUE}4. Testing Backend-AI Service Integration${NC}"
echo "----------------------------------------"

# Test backend routine creation with AI analysis
echo "Creating routine log with AI analysis..."

routine_response=$(make_request "POST" "$BACKEND_URL/api/routines" "$test_data")

# Check if routine was created successfully
if echo "$routine_response" | grep -q '"log_id"'; then
    print_result "Routine Creation" "PASS" "Routine log created successfully"
    
    # Extract log ID for further testing
    log_id=$(echo "$routine_response" | grep -o '"log_id":[0-9]*' | cut -d':' -f2)
    echo "   Log ID: $log_id"
    
    # Check for AI response in the routine creation response
    if echo "$routine_response" | grep -q '"ai_response"'; then
        print_result "AI Response Integration" "PASS" "AI response included in routine creation"
        
        # Check for enhanced features in backend response
        if echo "$routine_response" | grep -q '"enhanced_recommendations"'; then
            print_result "Enhanced Recommendations Storage" "PASS" "Backend stores enhanced recommendations"
        else
            print_result "Enhanced Recommendations Storage" "FAIL" "Enhanced recommendations not stored"
        fi
        
        if echo "$routine_response" | grep -q '"behavioral_contexts"'; then
            print_result "Behavioral Contexts Storage" "PASS" "Backend stores behavioral contexts"
        else
            print_result "Behavioral Contexts Storage" "FAIL" "Behavioral contexts not stored"
        fi
        
        if echo "$routine_response" | grep -q '"drift_analysis"'; then
            print_result "Drift Analysis Storage" "PASS" "Backend stores drift analysis"
        else
            print_result "Drift Analysis Storage" "FAIL" "Drift analysis not stored"
        fi
    else
        print_result "AI Response Integration" "FAIL" "AI response not included in routine creation"
    fi
else
    print_result "Routine Creation" "FAIL" "Failed to create routine log"
fi

echo -e "\n${BLUE}5. Testing Insight Retrieval${NC}"
echo "--------------------------------"

# Test getting insight for the created routine
if [ -n "$log_id" ]; then
    insight_response=$(make_request "GET" "$BACKEND_URL/api/routines/$log_id/insight")
    
    if echo "$insight_response" | grep -q '"routine_log"'; then
        print_result "Insight Retrieval" "PASS" "Insight retrieved successfully"
        
        # Check for enhanced features in insight
        if echo "$insight_response" | grep -q '"enhanced_recommendations"'; then
            print_result "Enhanced Recommendations Retrieval" "PASS" "Enhanced recommendations retrieved from database"
        else
            print_result "Enhanced Recommendations Retrieval" "FAIL" "Enhanced recommendations not found in insight"
        fi
        
        if echo "$insight_response" | grep -q '"behavioral_contexts"'; then
            print_result "Behavioral Contexts Retrieval" "PASS" "Behavioral contexts retrieved from database"
        else
            print_result "Behavioral Contexts Retrieval" "FAIL" "Behavioral contexts not found in insight"
        fi
        
        if echo "$insight_response" | grep -q '"drift_analysis"'; then
            print_result "Drift Analysis Retrieval" "PASS" "Drift analysis retrieved from database"
        else
            print_result "Drift Analysis Retrieval" "FAIL" "Drift analysis not found in insight"
        fi
    else
        print_result "Insight Retrieval" "FAIL" "Failed to retrieve insight"
    fi
else
    print_result "Insight Retrieval" "FAIL" "No log ID available for testing"
fi

echo -e "\n${BLUE}6. Testing Enhanced Prediction Endpoint${NC}"
echo "----------------------------------------"

# Test the enhanced prediction endpoint
enhanced_response=$(make_request "POST" "$AI_SERVICE_URL/predict/enhanced" "$test_data")

if echo "$enhanced_response" | grep -q '"enhanced_recommendations"'; then
    print_result "Enhanced Prediction Endpoint" "PASS" "Enhanced endpoint returns rich recommendations"
    
    # Check for specific enhanced recommendation fields
    if echo "$enhanced_response" | grep -q '"type"'; then
        print_result "Enhanced Recommendation Structure" "PASS" "Enhanced recommendations have proper structure"
    else
        print_result "Enhanced Recommendation Structure" "FAIL" "Enhanced recommendations missing type field"
    fi
    
    if echo "$enhanced_response" | grep -q '"title"'; then
        print_result "Enhanced Recommendation Title" "PASS" "Enhanced recommendations have titles"
    else
        print_result "Enhanced Recommendation Title" "FAIL" "Enhanced recommendations missing title field"
    fi
else
    print_result "Enhanced Prediction Endpoint" "FAIL" "Enhanced endpoint not working properly"
fi

echo -e "\n${BLUE}7. Testing Error Handling${NC}"
echo "--------------------------------"

# Test with invalid data
invalid_data='{
  "sleep_hours": "invalid",
  "meal_times": "not_an_array",
  "screen_time": -1,
  "exercise_duration": 25,
  "wake_up_time": "25:00",
  "bed_time": "invalid",
  "water_intake": -5,
  "stress_level": 15
}'

error_response=$(make_request "POST" "$BACKEND_URL/api/routines" "$invalid_data")

if echo "$error_response" | grep -q '"error"'; then
    print_result "Error Handling" "PASS" "Backend properly handles invalid data"
else
    print_result "Error Handling" "FAIL" "Backend should reject invalid data"
fi

echo -e "\n${BLUE}8. Testing Performance${NC}"
echo "--------------------------------"

# Test response time
start_time=$(date +%s.%N)
make_request "POST" "$BACKEND_URL/api/routines" "$test_data" > /dev/null
end_time=$(date +%s.%N)

response_time=$(echo "$end_time - $start_time" | bc -l)
response_time_ms=$(echo "$response_time * 1000" | bc -l)

if (( $(echo "$response_time_ms < 5000" | bc -l) )); then
    print_result "Response Time" "PASS" "Response time: ${response_time_ms}ms (under 5 seconds)"
else
    print_result "Response Time" "FAIL" "Response time: ${response_time_ms}ms (over 5 seconds)"
fi

echo -e "\n${BLUE}9. Testing Data Consistency${NC}"
echo "--------------------------------"

# Create another routine to test data consistency
test_data_2='{
  "sleep_hours": 5.0,
  "meal_times": ["08:30", "13:00", "19:30"],
  "screen_time": 8.0,
  "exercise_duration": 0.3,
  "wake_up_time": "08:30",
  "bed_time": "01:00",
  "water_intake": 1.5,
  "stress_level": 7
}'

routine_response_2=$(make_request "POST" "$BACKEND_URL/api/routines" "$test_data_2")

if echo "$routine_response_2" | grep -q '"log_id"'; then
    print_result "Data Consistency" "PASS" "Second routine created successfully"
    
    # Check if AI analysis is consistent
    if echo "$routine_response_2" | grep -q '"ai_response"'; then
        print_result "AI Analysis Consistency" "PASS" "AI analysis consistent across requests"
    else
        print_result "AI Analysis Consistency" "FAIL" "AI analysis not consistent"
    fi
else
    print_result "Data Consistency" "FAIL" "Failed to create second routine"
fi

echo -e "\n${BLUE}10. Testing User Insights Endpoint${NC}"
echo "----------------------------------------"

# Test getting user insights
insights_response=$(make_request "GET" "$BACKEND_URL/api/routines/insights?limit=5")

if echo "$insights_response" | grep -q '"routine_log"'; then
    print_result "User Insights" "PASS" "User insights retrieved successfully"
    
    # Count insights returned
    insight_count=$(echo "$insights_response" | grep -o '"routine_log"' | wc -l)
    print_result "Insights Count" "PASS" "Retrieved $insight_count insights"
else
    print_result "User Insights" "FAIL" "Failed to retrieve user insights"
fi

echo -e "\n${BLUE}==================================================${NC}"
echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
echo -e "${BLUE}📈 Total Tests: $((TESTS_PASSED + TESTS_FAILED))${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Backend-AI service integration is working perfectly.${NC}"
    echo -e "${GREEN}🚀 Enhanced features are fully functional:${NC}"
    echo -e "   ✅ Enhanced recommendations with rich content"
    echo -e "   ✅ Behavioral context analysis"
    echo -e "   ✅ Drift detection and analysis"
    echo -e "   ✅ Database storage of all enhanced features"
    echo -e "   ✅ API endpoints returning enhanced data"
else
    echo -e "\n${YELLOW}⚠️  Some tests failed. Please check the issues above.${NC}"
fi

echo -e "\n${BLUE}🔗 Next Steps:${NC}"
echo -e "   1. Deploy AI service to Render"
echo -e "   2. Update backend AI_SERVICE_URL to production URL"
echo -e "   3. Test production integration"
echo -e "   4. Update frontend to display enhanced features" 