# Quick Build & Deploy Commands

## iOS Production Build

### Step 1: Pre-Build Preparation
```bash
# Navigate to frontend directory
cd /Users/oskarsanchez-chagollan/School_Projects/lifepattern/frontend

# Clean install dependencies
rm -rf node_modules
npm install

# Clear Expo cache
npx expo start --clear
# Press Ctrl+C to stop after cache clears

# Run type check (optional - will show warnings but should not block build)
npm run type-check
```

### Step 2: Create Production Build
```bash
# Build for iOS with EAS (production profile)
eas build --platform ios --profile production --clear-cache

# Or if you want to build locally (requires Mac with Xcode)
# eas build --platform ios --profile production --local
```

### Step 3: Monitor Build
- Go to: https://expo.dev/accounts/[your-account]/projects/lifepattern-ai/builds
- Watch build progress
- Download logs if build fails
- Build typically takes 15-30 minutes

### Step 4: Submit to TestFlight
```bash
# After build completes successfully
eas submit --platform ios --profile production

# Follow prompts to select the build
# Enter Apple ID credentials if prompted
```

### Step 5: TestFlight Testing
- Wait 10-15 minutes for processing
- Open TestFlight app on iPhone/iPad
- Install build
- Test thoroughly (see checklist below)

## Quick Test Checklist

After installing from TestFlight:

```
□ App launches without crash
□ No immediate error screens
□ Can navigate to Register screen
□ Can navigate to Login screen
□ Can create new account
□ Can log in
□ Can navigate to Dashboard
□ Can access Settings
□ Can log out
□ App doesn't crash when:
  □ Minimizing/reopening
  □ Locking/unlocking device
  □ With airplane mode on
  □ With poor network connection
```

## Troubleshooting Build Errors

### If build fails with "Firebase error"
```bash
# Check firebase credentials
cat firebase/config.ts

# Ensure Firebase SDK version is compatible
npm list firebase
```

### If build fails with "Metro bundler error"
```bash
# Clear all caches
rm -rf node_modules
npm cache clean --force
npm install
npx expo start --clear
```

### If build fails with "EAS credentials error"
```bash
# Check EAS login
eas whoami

# Re-login if needed
eas logout
eas login
```

### If build fails with "iOS provisioning profile error"
```bash
# Let EAS manage credentials
eas credentials

# Or reset credentials
eas credentials -p ios --clear
```

## Build Profiles (eas.json)

### Preview Build (for testing)
```bash
eas build --platform ios --profile preview
```
- Creates internal distribution build
- Can be installed via EAS or TestFlight
- Faster than production build

### Production Build (for App Store)
```bash
eas build --platform ios --profile production
```
- Creates App Store release
- Requires proper signing certificates
- Optimized and minified

### Development Build (for local testing)
```bash
eas build --platform ios --profile development
```
- Includes dev tools
- Can run on simulator
- Uses debug configuration

## Useful Commands

### Check build status
```bash
eas build:list --platform ios --limit 5
```

### View build logs
```bash
eas build:view [build-id]
```

### Cancel running build
```bash
eas build:cancel [build-id]
```

### Configure credentials
```bash
eas credentials -p ios
```

### Update app.json version
```bash
# Manually edit app.json
# Update "version" and "ios.buildNumber"
```

## Version Management

Current version: **1.0.2** (Build **2**)

To increment version:
1. Edit `app.json`
2. Update `expo.version` (e.g., "1.0.3")
3. Update `expo.ios.buildNumber` (e.g., "3")
4. Commit changes
5. Build new version

## Important Notes

1. **Build Number**: Must increment for each TestFlight/App Store upload
2. **Version**: Can stay same for internal builds, must increment for App Store
3. **Caching**: Always use `--clear-cache` for production builds
4. **Testing**: Test on real device, not just simulator
5. **Logs**: Save build logs if build fails

## Emergency Rollback

If new version crashes:
```bash
# 1. Go to App Store Connect
# 2. Find previous stable version
# 3. Set it as current version for TestFlight
# 4. Fix issues in code
# 5. Build new version with incremented build number
```

## Resources

- EAS Build Docs: https://docs.expo.dev/build/introduction/
- TestFlight Guide: https://developer.apple.com/testflight/
- App Store Connect: https://appstoreconnect.apple.com
- EAS Dashboard: https://expo.dev

## Support Contacts

- Expo Support: https://expo.dev/contact
- Apple Developer Support: https://developer.apple.com/support/

---

**Last Updated**: 2025-11-23
**Current Version**: 1.0.2 (Build 2)
**Status**: Ready for production build
