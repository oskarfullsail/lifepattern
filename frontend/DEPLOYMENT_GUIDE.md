# LifePattern AI - Deployment Guide

## Quick Deploy

### Option 1: Deploy Everything (Web + Mobile)
```bash
cd frontend
./deploy-all-auto.sh both
```

### Option 2: Deploy Web Only
```bash
cd frontend
./deploy-all-auto.sh web
```

### Option 3: Deploy Mobile Only
```bash
cd frontend
./deploy-all-auto.sh mobile
```

### Option 4: Interactive Deployment
```bash
cd frontend
./deploy-all.sh
```

---

## What Gets Updated

The deployment script automatically increments:

- **package.json version**: `1.0.0` → `1.0.1` (patch increment)
- **app.json version**: `1.0.5` → `1.0.6` (patch increment)
- **iOS buildNumber**: `7` → `8` (+1)
- **Android versionCode**: `12` → `13` (+1)

---

## Deployment Steps

### 1. Web Deployment (Firebase)

The script will:
1. ✅ Clean previous build
2. ✅ Build for production (`npm run build:web:production`)
3. ✅ Copy privacy policy
4. ✅ Deploy to Firebase Hosting

**Result:** Live at https://lifepattern-ai.web.app

### 2. Mobile Deployment (Expo)

The script will:
1. ✅ Update version numbers
2. ✅ Start EAS build for iOS and Android
3. ✅ Builds run on Expo servers (20-30 minutes)

**Monitor:** https://expo.dev

**After builds complete:**
```bash
# Submit iOS to App Store
eas submit --platform ios --latest

# Submit Android to Play Store
eas submit --platform android --latest
```

---

## Prerequisites

Make sure you have:
- ✅ Node.js installed
- ✅ Firebase CLI: `npm install -g firebase-tools`
- ✅ EAS CLI: `npm install -g eas-cli`
- ✅ Logged into Firebase: `firebase login`
- ✅ Logged into Expo: `eas login`

---

## Current Versions

After deployment, versions will be:
- **package.json**: `1.0.1`
- **app.json**: `1.0.6`
- **iOS buildNumber**: `8`
- **Android versionCode**: `13`

---

## Troubleshooting

### Firebase deployment fails
```bash
firebase login
firebase use --add  # Select your project
```

### EAS build fails
```bash
eas login
eas whoami  # Verify you're logged in
```

### Build takes too long
- Normal: 20-30 minutes
- Check status at: https://expo.dev
- You can continue working while builds run

---

## Manual Version Update

If you need to update versions manually:

**package.json:**
```json
"version": "1.0.1"
```

**app.json:**
```json
{
  "expo": {
    "version": "1.0.6",
    "ios": {
      "buildNumber": "8"
    },
    "android": {
      "versionCode": 13
    }
  }
}
```

---

## Deployment Checklist

Before deploying:
- [ ] All tests passing
- [ ] Version numbers reviewed
- [ ] Changelog updated (if applicable)
- [ ] Firebase CLI logged in
- [ ] EAS CLI logged in
- [ ] Backend API is running and accessible

After deploying:
- [ ] Test web deployment
- [ ] Monitor mobile builds
- [ ] Submit to app stores (after builds complete)
- [ ] Update release notes

