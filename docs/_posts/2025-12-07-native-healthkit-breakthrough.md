---
layout: post
title: "The Native HealthKit Breakthrough: From Expo Go Limitations to Full Health Integration"
date: 2025-12-07
categories: [Mobile, iOS, HealthKit, Native Development, LifePattern]
tags: [healthkit, apple-health, expo, react-native, native-modules, ios-development, race-conditions]
author: LifePattern Team
---

# The Native HealthKit Breakthrough: From Expo Go Limitations to Full Health Integration

## 🍎 The Missing Piece: Native Health Data

LifePattern AI is all about understanding your daily patterns—sleep, activity, stress, and more. But manually entering health data every day? That's friction. Real users want to pull data directly from their smartwatch or phone's health app. This week, we finally cracked native Apple HealthKit integration.

## 🚧 The Challenge: Expo Go's Limitations

When you develop with Expo, the default development app (Expo Go) is incredibly convenient—scan a QR code and your app runs instantly. But there's a catch: **Expo Go doesn't support native modules**.

Our users were seeing this frustrating message:

```
🔧 Custom Build Required

Health app integration requires a custom app build 
with Apple HealthKit support.

📱 This feature is not available in Expo Go.
```

To access Apple Health data, we needed to break out of Expo Go and build a custom development client.

## 🔨 The Solution: Expo Prebuild

Expo's prebuild feature generates native iOS and Android project directories, giving us full access to native modules:

```bash
# Generate native directories
npx expo prebuild --clean

# Build and run with native modules
npx expo run:ios
```

This creates:
- `ios/LifePatternAI.xcworkspace` - Full Xcode project
- `ios/Podfile` - CocoaPods dependencies
- Native module linking for `react-native-health`

## 🐛 The Import Bug That Broke Everything

After generating native builds, HealthKit still wasn't working. The console showed a puzzling situation:

```
LOG  📱 iOS HealthKit native module available: true
LOG  📊 Health data available: true
LOG  📊 Permission status: {
  "isAuthorized": false,
  "isAvailable": false, 
  "message": "Health module not installed..."
}
```

Wait—the module is available AND unavailable? Something was wrong with our import.

**The Problem:**
```typescript
// BEFORE - Broken
const AppleHealthKit = require('react-native-health').default;
// AppleHealthKit was undefined!
```

The `react-native-health` module doesn't export a `default`—it uses named exports.

**The Fix:**
```typescript
// AFTER - Works!
const healthModule = require('react-native-health');
const AppleHealthKit = healthModule.default || 
                       healthModule.AppleHealthKit || 
                       healthModule;

console.log('🔍 Health module import result:', {
  hasDefault: !!healthModule.default,
  hasAppleHealthKit: !!healthModule.AppleHealthKit,
  moduleKeys: Object.keys(healthModule || {}),
});
```

Now the import finds the correct export, regardless of how the module structures it.

## ⏱️ The Race Condition That Corrupted State

While debugging HealthKit, we discovered an unrelated but critical bug: a race condition in our AI service wake-up mechanism.

**The Scenario:**
1. User opens app, triggering AI service wake-up
2. Wake-up starts with 120-second timeout
3. AI service responds after 15 seconds (success!)
4. App shows "AI Available" ✅
5. ...105 seconds later, timeout fires
6. App suddenly shows "AI Unavailable" ❌

The timeout was living on as a zombie, corrupting state long after success.

**The Problem:**
```typescript
// BEFORE - Race condition
const overallTimeoutPromise = new Promise<boolean>((resolve) => {
  wakeupTimeout = setTimeout(() => {
    updateStatus({ isWakingUp: false, ... }); // ⚠️ Fires even after success!
    resolve(false);
  }, WAKEUP_OVERALL_TIMEOUT_MS);
});

return Promise.race([wakeupPromise, overallTimeoutPromise]);
```

**The Fix:**
```typescript
// AFTER - Clean state management
let timeoutFired = false;

const clearWakeupTimeout = () => {
  if (wakeupTimeout) {
    clearTimeout(wakeupTimeout);
    wakeupTimeout = null;
  }
};

const finalizeWakeup = (success: boolean, statusUpdate?: Partial<AIServiceStatus>) => {
  if (!timeoutFired) {
    clearWakeupTimeout(); // Cancel the zombie
    isWakeupInProgress = false;
    if (statusUpdate) updateStatus(statusUpdate);
  }
};

// In success path:
if (isAwake) {
  clearWakeupTimeout(); // Kill timeout BEFORE async work
  // ... get heartbeat ...
  finalizeWakeup(true, { isAvailable: true, isWakingUp: false });
  return true;
}
```

Key changes:
- `timeoutFired` flag prevents late state updates
- Clear timeout **before** any async operations
- Centralized `finalizeWakeup()` helper for consistent cleanup

## 🎯 Context-Aware Error Messages

Another improvement: users no longer see confusing error messages. We now detect *why* health import failed and show appropriate guidance:

**Module Not Installed (Expo Go):**
```
🔧 Custom Build Required

Health app integration requires a custom app build 
with Apple HealthKit support.

📱 This feature is not available in Expo Go.

To enable Health App import:
1. Run: npx expo prebuild
2. Run: npx expo run:ios

💡 For now, use Manual Entry to log your health data.

[OK]  [Use Manual Entry]
```

**Permissions Denied (Custom Build):**
```
Permissions Required

Please grant health data access in your device settings:

Settings → Privacy & Security → Health → LifePattern

[Cancel]  [Open Settings]  [Try Again]
```

## ✅ The Results

After all these fixes:

**HealthKit Integration:**
- ✅ Native module properly detected and loaded
- ✅ Permission dialog appears correctly
- ✅ Sleep data imports from Apple Health
- ✅ Step count imports from Apple Health
- ✅ Heart rate data accessible

**AI Service Stability:**
- ✅ Race condition eliminated
- ✅ No more delayed state corruption
- ✅ Consistent "Available" status after wake-up

**User Experience:**
- ✅ Clear error messages with solutions
- ✅ "Manual Entry" fallback always available
- ✅ Dashboard auto-refreshes after data import

## 📱 Testing on Real Hardware

HealthKit requires physical iOS devices for full testing. Our validation process:

```
LOG  📱 Fetching iOS health data...
LOG  📱 AppleHealthKit loaded for data fetch: true
LOG  ✅ Sleep: 7.5 hours
LOG  ✅ Steps: 8432
LOG  ✅ Heart Rate: 72 bpm avg
```

Seeing real health data flow from Apple Health into LifePattern AI was deeply satisfying. No more manual entry—just seamless integration.

## 💡 Lessons Learned

### 1. Native Modules Require Native Builds
Expo Go is great for rapid development, but native features need native builds. Plan for this from the start.

### 2. Module Imports Aren't Always Obvious
Different packages export differently. Defensive import patterns (`module.default || module.Named || module`) handle variations gracefully.

### 3. Timeouts Are Dangerous
Any `setTimeout` paired with async operations needs careful cleanup. Race conditions are subtle and appear randomly—making them hard to debug in production.

### 4. Error Context Matters
"Something went wrong" is useless. "You need to run `npx expo run:ios`" is actionable. Always give users a path forward.

### 5. Test on Real Devices
Simulators lie. HealthKit, in particular, has limited simulator support. Physical device testing is essential.

## 🚀 What's Next

With native HealthKit working:

1. **Android Health Connect** - Implement equivalent Android integration
2. **Background Sync** - Periodic health data sync while app is closed
3. **More Data Types** - Workouts, nutrition, mindfulness
4. **EAS Build** - Set up automated TestFlight builds without local Xcode
5. **User Rollout** - Deploy to beta testers with native builds

## 🎉 The Breakthrough Moment

After days of debugging imports, race conditions, and native module quirks, seeing this in the logs was pure joy:

```
LOG  ✅ Health data imported successfully!
LOG  📊 Sleep: 7.2 hours (from Apple Health)
LOG  📊 Steps: 9,847 (from Apple Health)
LOG  📊 Heart Rate: 68 bpm resting (from Apple Health)
LOG  🤖 Analyzing patterns with AI...
```

LifePattern AI now truly lives up to its name—automatically learning from your life's patterns, no manual entry required.

---

**Repository:** https://github.com/oskarfullsail/lifepattern  
**iOS Build:** Custom development build with HealthKit  
**Status:** ✅ Native health integration working  
**Next:** Android Health Connect implementation

