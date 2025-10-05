#!/bin/bash

echo "🚀 LifePattern Full Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting LifePattern deployment process..."

# Step 1: Deploy Firebase Frontend
print_status "Step 1: Deploying Firebase Frontend..."
cd frontend
if npm run build:web:production; then
    print_success "Frontend build completed"
    if firebase deploy --only hosting; then
        print_success "Firebase frontend deployed successfully!"
        print_status "Frontend URL: https://lifepattern-ai-dc5fe.web.app"
    else
        print_error "Firebase deployment failed"
        exit 1
    fi
else
    print_error "Frontend build failed"
    exit 1
fi
cd ..

# Step 2: Build Android APK
print_status "Step 2: Building Android APK..."
cd frontend
if npx expo build:android --type apk; then
    print_success "Android APK built successfully!"
    print_status "APK location: Check expo build output"
else
    print_warning "Android APK build failed - this is expected if you don't have Android SDK configured"
    print_status "You can build the APK later using: npx expo build:android --type apk"
fi
cd ..

# Step 3: Deploy Backend to Render
print_status "Step 3: Backend deployment instructions for Render.com"
echo ""
echo "To deploy the backend to Render.com:"
echo "1. Go to https://render.com"
echo "2. Create a new Web Service"
echo "3. Connect your GitHub repository"
echo "4. Use these settings:"
echo "   - Build Command: cd backend && go build -o main ./cmd/server"
echo "   - Start Command: ./main"
echo "   - Environment: Go"
echo "   - Port: 8080"
echo "5. Add environment variables from backend/env.render"
echo "6. Deploy!"
echo ""

# Step 4: Deploy AI Service to Render
print_status "Step 4: AI Service deployment instructions for Render.com"
echo ""
echo "To deploy the AI service to Render.com:"
echo "1. Go to https://render.com"
echo "2. Create a new Web Service"
echo "3. Connect your GitHub repository"
echo "4. Use these settings:"
echo "   - Build Command: cd ai-service && pip install -r requirements.txt"
echo "   - Start Command: uvicorn main:app --host 0.0.0.0 --port 8000"
echo "   - Environment: Python"
echo "   - Port: 8000"
echo "5. Deploy!"
echo ""

# Step 5: Update Frontend API URLs
print_status "Step 5: Update frontend API URLs for production"
echo ""
echo "After deploying backend and AI service:"
echo "1. Update frontend/app/api/client.ts with production URLs:"
echo "   - Backend: https://your-backend-url.onrender.com"
echo "   - AI Service: https://your-ai-service-url.onrender.com"
echo "2. Redeploy frontend: cd frontend && firebase deploy --only hosting"
echo ""

print_success "Deployment process completed!"
print_status "Next steps:"
echo "1. ✅ Firebase frontend is live at: https://lifepattern-ai-dc5fe.web.app"
echo "2. 🔄 Deploy backend to Render.com (follow instructions above)"
echo "3. 🔄 Deploy AI service to Render.com (follow instructions above)"
echo "4. 🔄 Update frontend API URLs and redeploy"
echo "5. 🔄 Build and distribute Android APK"
echo ""
print_status "Your app is now accessible at: https://lifepattern-ai-dc5fe.web.app"
