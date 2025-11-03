#!/bin/bash

# Script to verify Render has the latest backend deployment

echo "🔍 Checking Render Backend Deployment"
echo "======================================"
echo ""

# 1. Get the latest local commit
echo "📋 Latest Local Commit:"
git log -1 --oneline
echo ""

# 2. Check Render backend health
echo "🏥 Checking Render Backend Health:"
HEALTH_RESPONSE=$(curl -s https://lifepattern-backend.onrender.com/health)
echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
echo ""

# 3. Instructions to check in Render Dashboard
echo "📊 To verify in Render Dashboard:"
echo ""
echo "1. Go to: https://dashboard.render.com"
echo "2. Click on 'lifepattern-backend' service"
echo "3. Look for the latest deployment"
echo "4. Check that the commit SHA matches: $(git rev-parse --short HEAD)"
echo ""
echo "5. Look for these log messages in Render:"
echo "   ✅ 'Saved AI report for routine log X' (NEW - working!)"
echo "   ❌ 'pq: invalid input syntax for type json' (OLD - needs redeployment)"
echo ""

# 4. Check if AI service is healthy
echo "🤖 Checking Render AI Service Health:"
AI_HEALTH=$(curl -s https://lifepattern-ai-service.onrender.com/health)
echo "$AI_HEALTH" | jq '.' 2>/dev/null || echo "$AI_HEALTH"
echo ""

echo "✅ Done! Check the output above."
echo ""
echo "💡 Tip: Render auto-deploys when you push to 'main' branch."
echo "If the commit SHA doesn't match, wait a few minutes for Render to build and deploy."

