#!/bin/bash

# 🚀 LifePattern Backend Deployment Script
# This script helps deploy the backend to Render.com

echo "🚀 LifePattern Backend Deployment Script"
echo "========================================"

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Git repository has uncommitted changes"
    echo "Please commit all changes before deploying"
    exit 1
fi

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Error: Not on main branch (current: $CURRENT_BRANCH)"
    echo "Please switch to main branch before deploying"
    exit 1
fi

echo "✅ Git repository is clean and on main branch"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub"
else
    echo "❌ Failed to push to GitHub"
    exit 1
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Go to https://render.com"
echo "2. Sign up/login with your GitHub account"
echo "3. Click 'New +' → 'Web Service'"
echo "4. Connect your GitHub repository: oskarfullsail/lifepattern"
echo "5. Configure the service:"
echo "   - Name: lifepattern-backend"
echo "   - Environment: Docker"
echo "   - Branch: main"
echo "6. Set environment variables:"
echo "   - DATABASE_URL: (will be set after creating PostgreSQL)"
echo "   - JWT_SECRET: (generate a random string)"
echo "   - PORT: 8080"
echo "   - ENVIRONMENT: production"
echo "   - CORS_ORIGIN: https://lifepattern-ai-dc5fe.web.app"
echo "7. Create PostgreSQL database:"
echo "   - Click 'New +' → 'PostgreSQL'"
echo "   - Name: lifepattern-db"
echo "   - Update DATABASE_URL in web service"
echo ""
echo "📖 For detailed instructions, see: BACKEND_DEPLOYMENT_GUIDE.md"
echo ""
echo "🔗 Your repository: https://github.com/oskarfullsail/lifepattern"
echo "🌐 Frontend URL: https://lifepattern-ai-dc5fe.web.app" 