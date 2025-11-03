#!/bin/bash

# LifePattern Data Automation Setup Script
# This script installs all required packages for automated data collection

set -e  # Exit on error

echo "🚀 LifePattern Data Automation Setup"
echo "===================================="
echo ""

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the frontend directory"
    echo "   cd frontend && bash install-automation.sh"
    exit 1
fi

echo "📦 Installing packages..."
echo ""

# Tier 1: Essential packages (Smart Reminders)
echo "✅ Installing Tier 1: Smart Reminders..."
npx expo install expo-notifications
echo ""

# Tier 1: Background sync packages
echo "✅ Installing Tier 1: Background Sync..."
npx expo install expo-background-fetch expo-task-manager
echo ""

# Optional: Tier 2 packages (commented out by default)
echo "ℹ️  Optional packages (uncomment to install):"
echo "   - react-native-health (iOS Health integration)"
echo "   - react-native-google-fit (Android Fit integration)"
echo "   - @tryterra/terra-react (Multi-wearable support)"
echo ""

# Uncomment to install optional packages:
# echo "✅ Installing iOS Health integration..."
# npm install react-native-health
# echo ""

# echo "✅ Installing Android Fit integration..."
# npm install react-native-google-fit
# echo ""

# echo "✅ Installing Terra API (multi-wearable)..."
# npm install @tryterra/terra-react
# echo ""

echo "✅ All essential packages installed!"
echo ""
echo "📋 Next Steps:"
echo "1. Read QUICK_IMPLEMENTATION_GUIDE.md"
echo "2. Add reminder code to App.tsx (see guide)"
echo "3. Test with: smartReminders.sendTestReminder()"
echo "4. Enable daily reminders"
echo ""
echo "🎯 Expected Impact:"
echo "   - 3x more data with reminders"
echo "   - 10x more data with background sync"
echo "   - 100x more data with wearables"
echo ""
echo "📚 Documentation:"
echo "   - Strategy: ../DATA_AUTOMATION_STRATEGY.md"
echo "   - Quick Guide: ../QUICK_IMPLEMENTATION_GUIDE.md"
echo "   - Health Sync: app/services/healthSync.ts"
echo "   - Reminders: app/services/smartReminders.ts"
echo ""
echo "✨ Ready to transform your data collection!"

