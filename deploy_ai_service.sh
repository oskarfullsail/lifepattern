#!/bin/bash

# Deploy AI Service to Render
echo "🚀 Deploying AI Service to Render"
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

# Step 1: Verify current state
echo -e "\n${BLUE}Step 1: Verifying current state${NC}"
print_status "Checking AI service configuration..." "INFO"

# Check if drift detector imports are commented out
if grep -q "# from models.drift_detector" ai-service/main.py; then
    print_status "Drift detector imports are properly commented out" "SUCCESS"
else
    print_status "Drift detector imports are NOT commented out" "ERROR"
    echo "Please comment out the drift detector imports in ai-service/main.py"
    exit 1
fi

# Check if drift detector initialization is commented out
if grep -q "# drift_detector = DriftDetector()" ai-service/main.py; then
    print_status "Drift detector initialization is properly commented out" "SUCCESS"
else
    print_status "Drift detector initialization is NOT commented out" "ERROR"
    echo "Please comment out the drift detector initialization in ai-service/main.py"
    exit 1
fi

# Step 2: Test local AI service
echo -e "\n${BLUE}Step 2: Testing local AI service${NC}"
print_status "Testing AI service locally..." "INFO"

# Check if Docker containers are running
if docker-compose ps | grep -q "lifepattern-ai-service.*Up"; then
    print_status "AI service container is running" "SUCCESS"
else
    print_status "AI service container is not running" "WARNING"
    echo "Starting AI service container..."
    docker-compose up -d ai-service
    sleep 10
fi

# Test AI service health
ai_health=$(curl -s http://localhost:8000/health 2>/dev/null)
if echo "$ai_health" | grep -q '"status":"healthy"'; then
    print_status "AI service is healthy locally" "SUCCESS"
else
    print_status "AI service health check failed locally" "ERROR"
    echo "Please fix local AI service issues before deploying"
    exit 1
fi

# Test enhanced features
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

ai_response=$(curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d "$test_data" 2>/dev/null)

if echo "$ai_response" | grep -q '"enhanced_recommendations"'; then
    print_status "Enhanced features are working locally" "SUCCESS"
else
    print_status "Enhanced features are not working locally" "ERROR"
    echo "Please fix enhanced features before deploying"
    exit 1
fi

# Step 3: Prepare for deployment
echo -e "\n${BLUE}Step 3: Preparing for deployment${NC}"
print_status "Checking render.yaml configuration..." "INFO"

if [ -f "render.yaml" ]; then
    print_status "render.yaml found" "SUCCESS"
else
    print_status "render.yaml not found" "ERROR"
    exit 1
fi

# Step 4: Deploy to Render
echo -e "\n${BLUE}Step 4: Deploying to Render${NC}"
print_status "Deploying AI service to Render..." "INFO"

echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "1. Make sure you have the Render CLI installed: npm install -g @render/cli"
echo "2. Make sure you're logged in to Render: render login"
echo "3. The deployment will use the render.yaml configuration"
echo ""
echo -e "${BLUE}To deploy manually:${NC}"
echo "1. Push your changes to GitHub:"
echo "   git add ."
echo "   git commit -m 'Fix AI service imports for deployment'"
echo "   git push origin main"
echo ""
echo "2. Render will automatically deploy from the render.yaml configuration"
echo "   Or you can trigger deployment manually from the Render dashboard"
echo ""

# Step 5: Verify deployment
echo -e "\n${BLUE}Step 5: Post-deployment verification${NC}"
print_status "After deployment, verify the following:" "INFO"

echo "1. Check Render dashboard for deployment status"
echo "2. Test the deployed AI service:"
echo "   curl https://lifepattern-ai-service.onrender.com/health"
echo "3. Test enhanced features:"
echo "   curl -X POST https://lifepattern-ai-service.onrender.com/predict \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '$test_data'"

echo -e "\n${BLUE}==================================================${NC}"
echo -e "${BLUE}🎯 AI Service Deployment Checklist:${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "   ✅ Drift detector imports commented out"
echo -e "   ✅ Enhanced features working locally"
echo -e "   ✅ render.yaml configured correctly"
echo -e "   🔄 Ready for Render deployment"
echo -e "   📋 Manual deployment steps provided above"

echo -e "\n${BLUE}🔗 Useful URLs:${NC}"
echo -e "   Render Dashboard: https://dashboard.render.com"
echo -e "   AI Service URL: https://lifepattern-ai-service.onrender.com"
echo -e "   Health Check: https://lifepattern-ai-service.onrender.com/health"

echo -e "\n${BLUE}🚀 Next Steps:${NC}"
echo -e "   1. Deploy AI service to Render"
echo -e "   2. Verify AI service is working on Render"
echo -e "   3. Update backend AI_SERVICE_URL if needed"
echo -e "   4. Deploy backend to Render"

echo -e "\n${GREEN}🎉 Ready to deploy AI service to Render!${NC}" 