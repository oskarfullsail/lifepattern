---
layout: post
title: "Conquering App Store Submission Obstacles: The Battle for iOS and Android"
date: 2025-11-16
categories: [Mobile, App Store, Deployment, LifePattern]
tags: [ios, android, app-store, testflight, google-play, expo, eas, obstacles, troubleshooting]
author: LifePattern Team
---

# Conquering App Store Submission Obstacles: The Battle for iOS and Android

## 🎯 The Challenge: Getting LifePattern AI to Users

After months of development, building a robust backend, sophisticated AI models, and a beautiful cross-platform frontend, we reached a critical milestone: **getting the app into users' hands**. This meant navigating the complex world of app store submissions - a journey filled with unexpected obstacles, cryptic error messages, and configuration nightmares.

## 🚨 The Obstacles We Faced

### **Obstacle 1: "Bundle Version Must Be Higher" - The Versioning Nightmare**

**The Problem:**
```
❌ Error: Bundle version must be higher than previously uploaded version.
```

Our first submission attempt failed immediately. We had version `1.0.0` with build number `1.0.0`, but Apple requires each submission to have a higher version or build number than the previous one.

**The Solution:**
We learned that version management in Expo requires careful coordination:
- `expo.version`: The user-facing version (e.g., "1.0.1")
- `expo.ios.buildNumber`: The iOS build number (must increment)
- `expo.android.versionCode`: The Android version code (must increment)

**What We Did:**
```json
// app.json - Before
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "buildNumber": "1.0.0"
    },
    "android": {
      "versionCode": 2
    }
  }
}

// app.json - After
{
  "expo": {
    "version": "1.0.1",
    "ios": {
      "buildNumber": "1.0.1"
    },
    "android": {
      "versionCode": 9
    }
  }
}
```

**Lesson Learned:** Always increment versions before building, and keep a version log to track what's been submitted.

---

### **Obstacle 2: "Your App Currently Targets API Level 34" - Android's Moving Target**

**The Problem:**
```
❌ Error: Your app currently targets API level 34 and must target at least API level 35 
to ensure it is built on the latest APIs optimized for security and performance.
```

Just when we thought Android was configured correctly, Google Play raised the bar. They require apps to target the latest API level (35 for Android 15), but our build kept targeting API 34 despite our configuration.

**The Investigation:**
We discovered that Expo's build system has multiple places where API levels can be configured:
1. Direct in `app.json` (`android.targetSdkVersion`)
2. Via `expo-build-properties` plugin
3. EAS remote settings (which can override local settings!)

**The Solution:**
We had to configure API levels in **three places** to ensure they stuck:

```json
// app.json - Direct configuration
{
  "expo": {
    "android": {
      "compileSdkVersion": 35,
      "targetSdkVersion": 35
    }
  }
}

// app.json - Plugin configuration
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 35,
            "targetSdkVersion": 35,
            "minSdkVersion": 24
          }
        }
      ]
    ]
  }
}

// eas.json - Ensure local version source
{
  "cli": {
    "appVersionSource": "local"  // Critical: Use local config, not remote
  }
}
```

**The Hurdle:** Even after configuring everything, builds kept using API 34. We had to:
1. Clear EAS build cache: `eas build --clear-cache`
2. Verify configuration with our custom script
3. Rebuild from scratch

**Lesson Learned:** When dealing with build systems, check **every** configuration layer, and always clear cache when changing build properties.

---

### **Obstacle 3: "Version Code 7 Has Already Been Used" - The Incrementing Nightmare**

**The Problem:**
```
❌ Error: Version code 7 has already been used. Try another version code.
```

We kept hitting this error even after incrementing the version code. The issue? EAS was using **remote version codes** instead of our local configuration.

**The Root Cause:**
```json
// eas.json - Before (WRONG)
{
  "cli": {
    "appVersionSource": "remote"  // ❌ Uses EAS remote settings
  }
}

// eas.json - After (CORRECT)
{
  "cli": {
    "appVersionSource": "local"  // ✅ Uses app.json configuration
  }
}
```

**The Fix:**
We changed `appVersionSource` from `"remote"` to `"local"`, ensuring EAS uses the version codes we define in `app.json`. We also had to increment to version code 9 to skip the already-used codes.

**Lesson Learned:** Always verify which version source EAS is using. Remote settings can override local configs silently.

---

### **Obstacle 4: "Privacy Policy Required" - Android's Privacy Demands**

**The Problem:**
```
❌ Error: Your APK or Android App Bundle is using permissions that require a privacy policy: 
(android.permission.CAMERA). Learn More
```

Google Play requires a privacy policy URL for apps using sensitive permissions like camera, location, or health data.

**The Solution:**
We added the privacy policy URL to `app.json`:

```json
{
  "expo": {
    "android": {
      "privacyPolicy": "https://lifepattern-ai.web.app/privacy-policy.html"
    }
  }
}
```

But we also had to:
1. Add the privacy policy URL in Google Play Console
2. Ensure the URL is publicly accessible
3. Verify the policy covers all permissions we use

**Lesson Learned:** Privacy policies aren't just a legal requirement - they're a technical requirement for app store submissions.

---

### **Obstacle 5: "APK vs App Bundle" - The Format Confusion**

**The Problem:**
We were building APK files, but Google Play requires App Bundles (.aab) for production releases.

**The Solution:**
```json
// eas.json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"  // Changed from "apk"
      }
    }
  }
}
```

**The Confusion:**
- APK: Works for internal testing and direct distribution
- App Bundle (.aab): Required for Google Play Store production
- EAS can build both, but you need to specify which one

**Lesson Learned:** Know the difference between build formats and when to use each.

---

### **Obstacle 6: "Google Play Android Developer API Not Enabled" - The API Permission Maze**

**The Problem:**
```
❌ Error: Google Api Error: PERMISSION_DENIED: Google Play Android Developer API 
has not been used in project 635658321303 before or it is disabled.
```

When trying to automate Android submissions via EAS, we hit this API permission error.

**The Investigation:**
We discovered that:
1. The Google Play Android Developer API must be enabled in Google Cloud Console
2. The service account needs proper permissions
3. The API must be enabled for the correct Google Cloud project

**The Solution:**
1. Navigate to Google Cloud Console
2. Enable "Google Play Android Developer API"
3. Create/configure service account with Play Console access
4. Download service account key JSON
5. Configure EAS with the service account

**The Documentation We Created:**
We documented the entire process in `GOOGLE_SERVICE_ACCOUNT_SETUP.md` because it's complex and easy to miss steps.

**Lesson Learned:** API permissions are a multi-step process. Document the process for future reference.

---

### **Obstacle 7: "First Submission Must Be Manual" - The Automation Limitation**

**The Problem:**
```
❌ Error: You haven't submitted this app to Google Play Store yet. 
The first submission of the app needs to be performed manually.
```

EAS can automate submissions, but only **after** the first manual submission. This makes sense from Google's perspective (they want human review the first time), but it was unexpected.

**The Solution:**
We created a comprehensive guide (`FIRST_ANDROID_SUBMISSION_GUIDE.md`) for the manual first submission:
1. Build the app bundle manually or via EAS
2. Upload to Google Play Console manually
3. Fill out store listing information
4. Submit for review
5. After approval, future submissions can be automated

**Lesson Learned:** Automation has limits. Sometimes you need to do things manually the first time.

---

## 🛠️ The Tools We Built

### **1. Build Verification Script**

To prevent these issues from happening again, we created `verify-build-config.sh`:

```bash
#!/bin/bash
# Checks all critical build configuration before building
# - App version and build numbers
# - Android version code
# - API level 35 configuration
# - expo-build-properties plugin setup
# - EAS configuration
```

This script catches configuration issues **before** we start a 20-minute build process.

### **2. Comprehensive Documentation**

We created guides for every obstacle:
- `APPLE_STORE_REQUIREMENTS.md` - iOS submission checklist
- `FIRST_ANDROID_SUBMISSION_GUIDE.md` - Android first submission
- `GOOGLE_SERVICE_ACCOUNT_SETUP.md` - API setup
- `FIX_VERSION_CODE_ERROR.md` - Version code issues
- `FIX_API_LEVEL_35.md` - API level configuration
- `ANDROID_PRIVACY_POLICY_FIX.md` - Privacy policy setup

### **3. Version Management System**

We established a clear versioning strategy:
- **Semantic Versioning**: Major.Minor.Patch (e.g., 1.0.1)
- **Build Numbers**: Increment for each build
- **Version Codes**: Android-specific, must always increment
- **Documentation**: Track all versions in milestone docs

---

## 💡 Key Takeaways

### **1. App Store Submissions Are Complex**
There are many moving parts: versions, build numbers, API levels, permissions, formats, APIs. One misconfiguration can block your entire submission.

### **2. Documentation Is Critical**
We created guides for every obstacle because:
- We'll forget the solutions
- Others might face the same issues
- The process is complex enough to warrant documentation

### **3. Automation Has Limits**
While EAS automates a lot, some things must be done manually:
- First app submission
- App Store Connect configuration
- Privacy policy setup
- Service account creation

### **4. Verification Prevents Pain**
Our build verification script saves hours by catching issues before builds start. Always verify configuration before building.

### **5. Persistence Pays Off**
Every obstacle had a solution. The key was:
- Reading error messages carefully
- Consulting documentation
- Testing incrementally
- Not giving up

---

## 🎉 The Victory

After overcoming all these obstacles, we successfully:
- ✅ Submitted iOS app to TestFlight (Build 1.0.1)
- ✅ Configured Android for Google Play submission
- ✅ Created automated build verification
- ✅ Documented all processes
- ✅ Established version management system

**The Result:** LifePattern AI is now available for testing on iOS TestFlight, and Android is ready for submission once we complete the first manual submission.

---

## 📚 Resources Created

All the guides and scripts we created are available in the repository:
- Build verification script
- App store submission guides
- Configuration fix documentation
- Version management system

**Next Steps:**
- Complete Android first manual submission
- Begin user testing via TestFlight
- Gather feedback and iterate
- Prepare for public release

The journey to app store submission was challenging, but every obstacle taught us something valuable. Now we're ready to get LifePattern AI into users' hands! 🚀

---

**Repository:** https://github.com/oskarfullsail/lifepattern  
**iOS TestFlight:** Available via App Store Connect (App ID: 6754825838)  
**Documentation:** Available in `/frontend/` directory

