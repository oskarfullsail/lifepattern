# Google Service Account Setup for Google Play Store Submissions

This guide will help you create a Google Service Account Key required for submitting your Android app to Google Play Store via EAS.

## Prerequisites
- A Google Cloud account
- Access to Google Play Console
- Your app already created in Google Play Console

## Step-by-Step Instructions

### Step 1: Select Your Existing Google Cloud Project

✅ **You already have a Firebase project: `lifepattern-ai-dc5fe`**

Since Firebase projects are also Google Cloud projects, you can use your existing project:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. In the project dropdown at the top, select **`lifepattern-ai-dc5fe`**
   - If you don't see it, click the project dropdown and search for "lifepattern-ai-dc5fe"
3. You're now working in your existing project - no need to create a new one!

### Step 2: Create a Service Account

1. Open [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) in Google Cloud Console
2. Click **Create Service Account**
3. Enter details:
   - **Service account name**: `lifepattern-play-store` (or any name you prefer)
   - **Service account ID**: Will auto-generate (or customize it)
   - **Description**: "Service account for LifePattern AI Play Store submissions"
4. Click **Done**

### Step 3: Copy the Service Account Email

1. From the **Service Accounts** list, find your newly created service account
2. **Copy the email address** (it will look like: `lifepattern-play-store@lifepattern-ai-dc5fe.iam.gserviceaccount.com`)
3. **Save this email** - you'll need it in Step 7

### Step 4: Create and Download the JSON Key

1. Click on your service account to open it
2. Go to the **Keys** tab
3. Click **ADD KEY** > **Create new key**
4. Select **JSON** as the key type
5. Click **Create**
6. A JSON file will automatically download to your computer
7. **Save this file securely** - you'll upload it to EAS in Step 10

**⚠️ Important**: Store this JSON file in a safe place. It contains sensitive credentials.

### Step 5: Enable Google Play Android Developer API

1. Open [Google Play Android Developer API](https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com)
2. Make sure your project is selected
3. Click **Enable**
4. Wait for the API to be enabled (usually takes a few seconds)

### Step 6: Open Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app (LifePattern AI)

### Step 7: Invite Service Account to Play Console

1. In Google Play Console, go to [Users and permissions](https://play.google.com/console/users-and-permissions)
2. Click **Invite new users**
3. Enter the **service account email** you copied in Step 3
4. Go to the **App permissions** tab
5. Select your app: **LifePattern AI**
6. Go to the **Account permissions** tab (or keep App permissions)
7. Select the following **required permissions**:
   - ✅ **View app information and download bulk reports**
   - ✅ **Manage production releases**
   - ✅ **Manage testing track releases**
   - ✅ **Manage store listing**
   - ✅ **View financial data, orders, and cancellation survey responses**
8. Click **Invite user**

### Step 8: Verify the Invitation

1. The service account should now appear in your Users and permissions list
2. Make sure it has the correct permissions

### Step 9: Upload the Key to EAS

Now you'll upload the JSON key file to EAS so it can submit your app:

```bash
cd /Users/oskarsanchez-chagollan/School_Projects/lifepattern/frontend
npx eas-cli credentials
```

1. Select **Android**
2. Select **Set up Google Service Account key**
3. When prompted, provide the path to your downloaded JSON file
4. EAS will upload and store the key securely

### Step 10: Test the Setup

After uploading the key, you can test it by submitting your app:

```bash
npx eas-cli submit --platform android --latest
```

## Troubleshooting

### Common Issues

1. **"Permission denied" error**
   - Make sure you've invited the service account in Google Play Console
   - Verify all required permissions are granted

2. **"API not enabled" error**
   - Go back to Step 5 and ensure the Google Play Android Developer API is enabled

3. **"Service account not found"**
   - Double-check the email address you copied in Step 3
   - Make sure you're using the correct Google Cloud project

## Security Best Practices

- ✅ Never commit the JSON key file to Git
- ✅ Store the key file in a secure location
- ✅ Use different service accounts for different projects
- ✅ Rotate keys periodically (create new keys and delete old ones)

## Next Steps

Once your Google Service Account is set up:

1. Build your Android app: `npx eas-cli build --platform android --profile production`
2. Submit to Google Play: `npx eas-cli submit --platform android --latest`

## References

- [Expo Documentation: Creating Google Service Account](https://github.com/expo/fyi/blob/main/creating-google-service-account.md)
- [EAS Submit Documentation](https://docs.expo.dev/submit/android/)

