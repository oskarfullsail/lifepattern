# First Android App Submission to Google Play Store - Manual Guide

Since this is your first submission, you need to upload the app manually through Google Play Console. After the first submission, EAS can handle subsequent submissions automatically.

## Prerequisites Checklist

- ✅ App built successfully (Build ID: `d18b248e-8e35-4283-baee-2b56c5bd483c`)
- ✅ App Version: `1.0.1`
- ✅ Version Code: `7`
- ✅ Google Service Account configured
- ✅ `.aab` file generated

## Step 1: Download Your App Bundle (.aab file)

### Option A: Download from EAS Dashboard
1. Go to: https://expo.dev/accounts/oskarmongoose/projects/lifepattern-ai/builds
2. Find your Android build (Build ID: `d18b248e-8e35-4283-baee-2b56c5bd483c`)
3. Click **Download** to get the `.aab` file
4. Save it to your computer (e.g., `~/Downloads/LifePatternAI.aab`)

### Option B: Download via EAS CLI
```bash
cd /Users/oskarsanchez-chagollan/School_Projects/lifepattern/frontend
npx eas-cli build:list --platform android --limit 1
# Note the build ID, then:
npx eas-cli build:download --id d18b248e-8e35-4283-baee-2b56c5bd483c
```

## Step 2: Access Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Sign in with your Google account
3. If you haven't created an app yet, you'll need to create it first (see Step 3)

## Step 3: Create Your App (If Not Already Created)

1. In Google Play Console, click **Create app**
2. Fill in the required information:
   - **App name**: `LifePattern AI`
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free (or Paid, if applicable)
   - **Declarations**: Check all applicable boxes
3. Click **Create app**

## Step 4: Complete App Content Requirements

Before you can upload your first release, you need to complete several sections:

### 4.1 App Access (If Required)
- Set up app access settings if your app has restricted access

### 4.2 Store Listing
Fill in all required fields:
- **App name**: `LifePattern AI`
- **Short description**: (50-80 characters)
  - Example: "AI-powered health and lifestyle tracking app"
- **Full description**: (4000 characters max)
  - Describe your app's features, benefits, and use cases
- **App icon**: Upload 512x512 PNG (you have `assets/icon-optimized.png`)
- **Feature graphic**: 1024x500 PNG (optional but recommended)
- **Screenshots**: 
  - Phone: At least 2 screenshots (required)
  - Tablet: Optional
  - TV: Optional
- **Category**: Select appropriate category (e.g., Health & Fitness)
- **Tags**: Add relevant tags
- **Contact details**: Your email and website
- **Privacy Policy**: 
  - URL: `https://lifepattern-ai.web.app/privacy-policy.html`
  - This is required!

### 4.3 Content Rating
1. Click **Start questionnaire**
2. Answer questions about your app's content
3. Complete the rating process
4. This is required before first release

### 4.4 Target Audience & Content
- Set target audience (e.g., 13+)
- Answer content questions
- Complete all required sections

### 4.5 Data Safety
- Fill out data safety form
- Declare what data you collect
- Explain how data is used
- Required for all apps

## Step 5: Set Up Production Track

1. In Google Play Console, go to your app
2. In the left sidebar, click **Production** (under Release)
3. Click **Create new release**

## Step 6: Upload Your App Bundle

1. In the **Create new release** page:
   - Click **Upload** under "App bundles"
   - Select your downloaded `.aab` file (LifePatternAI.aab)
   - Wait for upload to complete

2. **Release name**: Enter a version name (e.g., `1.0.1`)

3. **Release notes** (What's new in this version):
   - Example: "Initial release of LifePattern AI"
   - This is visible to users

4. Click **Save**

## Step 7: Review and Rollout

1. Review all the information you've entered
2. Make sure all required sections are complete:
   - ✅ Store listing
   - ✅ Content rating
   - ✅ Data safety
   - ✅ App bundle uploaded
   - ✅ Release notes added

3. Click **Review release**

4. If everything looks good, click **Start rollout to Production**

## Step 8: Submit for Review

1. After starting rollout, you'll see a summary
2. Click **Submit for review**
3. Google will review your app (usually 1-3 days)
4. You'll receive email notifications about the review status

## Step 9: Monitor Review Status

1. Check your email for review updates
2. Or check in Google Play Console under **Dashboard**
3. Status will show:
   - **In review**: Being reviewed
   - **Changes requested**: Need to fix issues
   - **Published**: App is live!

## After First Submission

Once your first submission is approved and published, you can use EAS for future submissions:

```bash
npx eas-cli submit --platform android --latest
```

EAS will automatically handle subsequent submissions.

## Required Assets Checklist

Before submitting, make sure you have:

- [ ] **App Icon**: 512x512 PNG (`assets/icon-optimized.png`)
- [ ] **Screenshots**: At least 2 phone screenshots (required)
- [ ] **Privacy Policy URL**: `https://lifepattern-ai.web.app/privacy-policy.html`
- [ ] **App Bundle**: `.aab` file downloaded from EAS
- [ ] **App Description**: Short and full descriptions written
- [ ] **Content Rating**: Completed questionnaire
- [ ] **Data Safety**: Form completed

## Common Issues & Solutions

### Issue: "Missing required information"
- **Solution**: Go through each section in Play Console and complete all required fields marked with red asterisks (*)

### Issue: "Privacy Policy URL not accessible"
- **Solution**: Make sure your privacy policy is deployed and accessible at the URL you provided

### Issue: "App icon doesn't meet requirements"
- **Solution**: Use a 512x512 PNG without transparency, rounded corners will be added automatically

### Issue: "Screenshots required"
- **Solution**: Take screenshots of your app on a phone/emulator and upload at least 2

## Quick Links

- [Google Play Console](https://play.google.com/console)
- [Your EAS Builds](https://expo.dev/accounts/oskarmongoose/projects/lifepattern-ai/builds)
- [Privacy Policy](https://lifepattern-ai.web.app/privacy-policy.html)
- [EAS Documentation](https://docs.expo.dev/submit/android/)

## Next Steps After Approval

1. Your app will be available on Google Play Store
2. Monitor user reviews and ratings
3. Use EAS for future updates:
   ```bash
   npx eas-cli build --platform android --profile production
   npx eas-cli submit --platform android --latest
   ```

Good luck with your submission! 🚀

