# Android Privacy Policy & Version Code Fix

## ✅ Changes Made

1. **Version Code**: Incremented from `8` to `9` (version code 7 was already used)
2. **Privacy Policy URL**: Added to Android configuration

## Important: Set Privacy Policy in Google Play Console

Even though we've added the privacy policy URL to `app.json`, you **must also set it in Google Play Console** for Google Play to recognize it.

### Steps to Set Privacy Policy in Google Play Console:

1. **Go to Google Play Console**
   - Visit: https://play.google.com/console
   - Select your app: **LifePattern AI**

2. **Navigate to Store Listing**
   - In the left sidebar, click **Store presence** → **Store listing**
   - Or go to: **Policy** → **App content** → **Privacy Policy**

3. **Add Privacy Policy URL**
   - Find the **Privacy Policy** field
   - Enter: `https://lifepattern-ai.web.app/privacy-policy.html`
   - Click **Save**

4. **Alternative Location (if not in Store Listing)**
   - Go to **Policy** → **App content**
   - Scroll to **Privacy Policy**
   - Enter the URL: `https://lifepattern-ai.web.app/privacy-policy.html`
   - Click **Save**

## Why Both Are Needed

- **app.json privacyPolicy**: Helps with app metadata
- **Google Play Console**: Required by Google Play for apps with sensitive permissions (like CAMERA)

## Permissions Requiring Privacy Policy

Your app uses these permissions that require a privacy policy:
- ✅ **CAMERA** - For QR code scanning
- ✅ **RECORD_AUDIO** - For voice input
- ✅ **ACCESS_FINE_LOCATION** - For location-based features
- ✅ **ACTIVITY_RECOGNITION** - For activity tracking

All of these are covered in your privacy policy at: `https://lifepattern-ai.web.app/privacy-policy.html`

## Next Steps

1. **Set Privacy Policy in Google Play Console** (see steps above)
2. **Rebuild your Android app:**
   ```bash
   cd /Users/oskarsanchez-chagollan/School_Projects/lifepattern/frontend
   npx eas-cli build --platform android --profile production
   ```
3. **Submit the new build** (version code 9) to Google Play

## Verify Privacy Policy is Accessible

Before submitting, verify your privacy policy is accessible:
- Open: https://lifepattern-ai.web.app/privacy-policy.html
- Make sure it loads without errors
- Ensure it's publicly accessible (no login required)

## After Setting Privacy Policy

Once you've:
1. ✅ Set privacy policy URL in Google Play Console
2. ✅ Built new app with version code 9
3. ✅ Verified privacy policy is accessible

You can submit your app and the privacy policy error should be resolved!

