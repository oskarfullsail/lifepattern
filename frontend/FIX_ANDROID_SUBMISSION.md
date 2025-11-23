# Fix Android Submission Error

## Issue
The error shows that the Google Play Android Developer API is not enabled for project `635658321303`.

## Quick Fix

### Step 1: Enable the API
Click this direct link to enable the API for your project:
**https://console.developers.google.com/apis/api/androidpublisher.googleapis.com/overview?project=635658321303**

Or follow these steps:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Make sure project `lifepattern-ai-dc5fe` is selected (or project number `635658321303`)
3. Go to [API Library - Android Publisher API](https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com?project=635658321303)
4. Click **Enable**
5. Wait 2-3 minutes for the API to propagate

### Step 2: Verify Service Account Setup

Make sure your service account has:
1. ✅ Been created in the correct project (`lifepattern-ai-dc5fe` / `635658321303`)
2. ✅ Been invited to Google Play Console with proper permissions
3. ✅ JSON key uploaded to EAS

### Step 3: Retry Submission

After enabling the API and waiting 2-3 minutes:

```bash
cd /Users/oskarsanchez-chagollan/School_Projects/lifepattern/frontend
npx eas-cli submit --platform android --latest
```

## Important Notes

- **Project Number**: `635658321303` (this is your Google Cloud project number)
- **Project ID**: `lifepattern-ai-dc5fe` (this is your Firebase project ID)
- Both refer to the same project, just different identifiers
- The API must be enabled in the project where your service account was created

## If Still Having Issues

1. Verify the service account was created in project `lifepattern-ai-dc5fe`
2. Check that the service account email is invited in Google Play Console
3. Re-upload the service account JSON key to EAS:
   ```bash
   npx eas-cli credentials
   # Select Android
   # Update Google Service Account key
   ```

