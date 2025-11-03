#!/bin/bash

# Set Frontend to Production Mode (Render Backend)

echo "🚀 Setting frontend to PRODUCTION mode..."
echo ""

# Update env.config.js
cat > env.config.js << 'EOF'
/**
 * Environment Configuration
 * 
 * IMPORTANT: Change FORCE_ENV to switch between development and production
 * 
 * Options:
 * - 'auto': Automatic detection (default)
 * - 'development': Force development mode (localhost)
 * - 'production': Force production mode (Render backend)
 */

module.exports = {
  // 🔧 CHANGE THIS TO SWITCH ENVIRONMENTS
  FORCE_ENV: 'production', // Options: 'auto', 'development', 'production'
  
  // Backend URLs
  BACKEND_URLS: {
    development: 'http://localhost:8080',
    production: 'https://lifepattern-backend.onrender.com',
    staging: 'https://lifepattern-backend-staging.onrender.com',
  },
  
  // API Timeouts (milliseconds)
  API_TIMEOUTS: {
    development: 15000,
    production: 30000,
    staging: 20000,
  }
};
EOF

echo "✅ Frontend set to PRODUCTION mode"
echo ""
echo "Backend URL: https://lifepattern-backend.onrender.com"
echo ""
echo "⚠️  IMPORTANT: Restart your dev server for changes to take effect:"
echo "   1. Stop the current server (Ctrl+C)"
echo "   2. Run: npm start"
echo ""

