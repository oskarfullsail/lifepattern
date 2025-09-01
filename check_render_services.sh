#!/bin/bash

# Check Render Services Status
echo "🔍 Checking Render Services Status"
echo "=================================="

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

echo -e "\n${BLUE}Current Render Services Status:${NC}"

# Check Backend Service
echo -e "\n${BLUE}1. Backend Service (lifepattern-backend)${NC}"
backend_response=$(curl -s -w "%{http_code}" https://lifepattern-backend.onrender.com/health 2>/dev/null)
backend_http_code="${backend_response: -3}"
backend_body="${backend_response%???}"

if [ "$backend_http_code" = "200" ]; then
    print_status "Backend is running and healthy" "SUCCESS"
    echo "   URL: https://lifepattern-backend.onrender.com"
else
    print_status "Backend is not responding (HTTP $backend_http_code)" "ERROR"
    echo "   URL: https://lifepattern-backend.onrender.com"
fi

# Check AI Service
echo -e "\n${BLUE}2. AI Service (lifepattern-ai-service)${NC}"
ai_response=$(curl -s -w "%{http_code}" https://lifepattern-ai-service.onrender.com/health 2>/dev/null)
ai_http_code="${ai_response: -3}"
ai_body="${ai_response%???}"

if [ "$ai_http_code" = "200" ]; then
    print_status "AI service is running and healthy" "SUCCESS"
    echo "   URL: https://lifepattern-ai-service.onrender.com"
elif [ "$ai_http_code" = "000" ] || [ "$ai_http_code" = "" ]; then
    print_status "AI service does not exist or is not accessible" "WARNING"
    echo "   This is expected - you need to create the AI service in Render"
else
    print_status "AI service is not responding (HTTP $ai_http_code)" "ERROR"
    echo "   URL: https://lifepattern-ai-service.onrender.com"
fi

echo -e "\n${BLUE}==================================================${NC}"
echo -e "${BLUE}🎯 Current Status Summary:${NC}"
echo -e "${BLUE}==================================================${NC}"

if [ "$backend_http_code" = "200" ] && [ "$ai_http_code" != "200" ]; then
    echo -e "${YELLOW}📋 Status: Backend is running, AI service needs to be created${NC}"
    echo -e ""
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo -e "   1. Go to Render Dashboard: https://dashboard.render.com"
    echo -e "   2. Create new Web Service named 'lifepattern-ai-service'"
    echo -e "   3. Use Dockerfile path: ai-service/Dockerfile"
    echo -e "   4. Set environment variables as specified in CREATE_AI_SERVICE_RENDER.md"
    echo -e "   5. Deploy and wait for completion"
    echo -e "   6. Run: ./verify_ai_deployment.sh"
    
elif [ "$backend_http_code" = "200" ] && [ "$ai_http_code" = "200" ]; then
    echo -e "${GREEN}🎉 Status: Both services are running!${NC}"
    echo -e ""
    echo -e "${BLUE}✅ Ready for integration testing${NC}"
    echo -e "   Run: ./verify_ai_deployment.sh"
    
else
    echo -e "${RED}❌ Status: Services need attention${NC}"
    echo -e ""
    echo -e "${BLUE}🔧 Actions needed:${NC}"
    echo -e "   1. Check Render dashboard for service status"
    echo -e "   2. Review service logs for errors"
    echo -e "   3. Verify environment variables"
fi

echo -e "\n${BLUE}📚 Documentation:${NC}"
echo -e "   - AI Service Creation Guide: CREATE_AI_SERVICE_RENDER.md"
echo -e "   - Deployment Verification: ./verify_ai_deployment.sh"
echo -e "   - Render Dashboard: https://dashboard.render.com"

echo -e "\n${BLUE}🔗 Service URLs:${NC}"
echo -e "   Backend: https://lifepattern-backend.onrender.com"
echo -e "   AI Service: https://lifepattern-ai-service.onrender.com"
echo -e "   Backend Health: https://lifepattern-backend.onrender.com/health"
echo -e "   AI Health: https://lifepattern-ai-service.onrender.com/health" 