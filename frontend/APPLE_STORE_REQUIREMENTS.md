# Apple App Store Submission Requirements - Complete Guide

This guide will help you complete all required information for App Store submission.

## ✅ Checklist of Required Items

- [ ] Copyright information
- [ ] Screenshots for 13-inch iPad displays
- [ ] Screenshots for 6.5-inch iPhone displays
- [ ] Privacy Policy URL in App Privacy
- [ ] Age Rating - Content descriptions
- [ ] Content Rights Information
- [ ] Privacy practices (Admin required)
- [ ] Price tier selection
- [ ] Support URL (English U.S.)

---

## 1. Copyright Information

**Where to add:** App Information → General Information → Copyright

**Format:** `© 2025 Your Name or Company Name`

**Example:**
- `© 2025 Oskar Sanchez-Chagollan`
- `© 2025 LifePattern AI`
- `© 2025 Your Company Name`

**Steps:**
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app (App ID: 6754825838)
3. Go to **App Information**
4. Scroll to **General Information**
5. Enter copyright in the **Copyright** field
6. Click **Save**

---

## 2. Screenshots Required

You need screenshots for:
- **6.5-inch iPhone displays** (iPhone 14 Pro Max, iPhone 13 Pro Max, etc.)
- **13-inch iPad displays** (iPad Pro 12.9-inch)

### Screenshot Requirements:
- **Format:** PNG or JPEG
- **No transparency**
- **No device frames** (Apple adds these automatically)
- **No status bar text** (Apple overlays this)
- **Minimum:** 2 screenshots required, but 3-5 recommended

### How to Create Screenshots:

#### Option A: Using iOS Simulator
```bash
# Start iOS Simulator
cd /Users/oskarsanchez-chagollan/School_Projects/lifepattern/frontend
npx expo start --ios

# In Simulator:
# 1. Choose device: iPhone 14 Pro Max (6.5-inch) or iPad Pro 12.9-inch (13-inch)
# 2. Navigate to your app screens
# 3. Press Cmd + S to take screenshot
# 4. Screenshots saved to Desktop
```

#### Option B: Using Physical Device
1. Open your app on iPhone/iPad
2. Navigate to key screens
3. Take screenshots (Power + Volume Up)
4. Transfer to computer

#### Option C: Using Design Tools
- Use Figma, Sketch, or similar tools
- Create mockups at required sizes:
  - **6.5-inch iPhone:** 1284 x 2778 pixels
  - **13-inch iPad:** 2048 x 2732 pixels

### Upload Screenshots:
1. Go to **App Store Connect** → Your App
2. Go to **App Store** tab
3. Select **iOS App** version
4. Scroll to **Screenshots**
5. Upload for:
   - **6.5" Display** (iPhone)
   - **12.9" Display** (iPad Pro)

---

## 3. Privacy Policy URL

**Your Privacy Policy URL:** `https://lifepattern-ai.web.app/privacy-policy.html`

**Where to add:** App Privacy → Privacy Policy URL

**Steps:**
1. Go to **App Privacy** section in App Store Connect
2. Scroll to **Privacy Policy URL**
3. Enter: `https://lifepattern-ai.web.app/privacy-policy.html`
4. Click **Save**

**Verify the URL is accessible:**
- Open the URL in a browser to confirm it loads
- Make sure it's publicly accessible (no login required)

---

## 4. Age Rating - Content Descriptions

**Where to add:** App Information → Age Rating

**Steps:**
1. Go to **App Information**
2. Click **Edit** next to Age Rating
3. Answer the questionnaire about your app's content
4. For each category, select frequency:
   - **None** - No content of this type
   - **Infrequent/Mild** - Rare or mild content
   - **Frequent/Intense** - Common or intense content

**For LifePattern AI (Health App), typical selections:**
- **Medical/Treatment Information:** Infrequent/Mild (if you provide health insights)
- **Unrestricted Web Access:** None (if app doesn't have a browser)
- **User-Generated Content:** None (if users don't share content)
- **Location Sharing:** Infrequent/Mild (if you use location data)
- **Other:** Select based on your app's features

**Complete all categories** and click **Save**

---

## 5. Content Rights Information

**Where to add:** App Information → Content Rights

**Steps:**
1. Go to **App Information**
2. Scroll to **Content Rights**
3. Answer the questions:
   - **Does your app use, display, or access third-party content?**
     - Usually: **No** (unless you use third-party APIs/content)
   - **Does your app contain, display, or access third-party content?**
     - Usually: **No**
   - **Do you have the rights to use all content in your app?**
     - **Yes**
4. Click **Save**

---

## 6. Privacy Practices (Admin Required)

**Important:** This section requires an **Admin** role in App Store Connect.

**Where to add:** App Privacy → Privacy Practices

**Steps:**
1. Go to **App Privacy** section
2. Click **Get Started** or **Edit**
3. Answer questions about data collection:

**For LifePattern AI, you likely collect:**
- **Health & Fitness Data** (HealthKit data)
- **Location Data** (if using location services)
- **User Content** (routine logs, notes)
- **Device ID** (for analytics)

**For each data type:**
1. Select what data you collect
2. Select how it's used (App Functionality, Analytics, etc.)
3. Select if it's linked to user identity
4. Select if it's used for tracking

**Example for Health Data:**
- **Data Type:** Health & Fitness
- **Collected:** Yes
- **Used for:** App Functionality
- **Linked to User:** Yes
- **Used for Tracking:** No

4. Click **Save** after completing all sections

---

## 7. Price Tier Selection

**Where to add:** Pricing and Availability

**Steps:**
1. Go to **Pricing and Availability**
2. Select **Price Schedule**
3. Choose a price tier:
   - **Free** (recommended for first release)
   - Or select a paid tier ($0.99, $1.99, etc.)
4. Set availability (usually **All countries or regions**)
5. Click **Save**

---

## 8. Support URL (English U.S.)

**Where to add:** App Information → App Store Information → Support URL

**Options:**
- Use your privacy policy URL: `https://lifepattern-ai.web.app/privacy-policy.html`
- Create a support page: `https://lifepattern-ai.web.app/support.html`
- Use your website: `https://lifepattern-ai.web.app`

**Steps:**
1. Go to **App Information**
2. Scroll to **App Store Information**
3. Under **English (U.S.)**, find **Support URL**
4. Enter: `https://lifepattern-ai.web.app/privacy-policy.html`
   - (Or create a dedicated support page)
5. Click **Save**

---

## Quick Reference: Direct Links

- [App Store Connect](https://appstoreconnect.apple.com)
- [Your App (ID: 6754825838)](https://appstoreconnect.apple.com/apps/6754825838)
- [Privacy Policy](https://lifepattern-ai.web.app/privacy-policy.html)

---

## Step-by-Step Submission Process

1. **Complete App Information:**
   - Copyright
   - Support URL
   - Content Rights

2. **Complete App Privacy:**
   - Privacy Policy URL
   - Privacy Practices (Admin required)

3. **Complete Age Rating:**
   - Answer all questions
   - Set frequency for each category

4. **Add Screenshots:**
   - 6.5-inch iPhone (at least 2)
   - 13-inch iPad (at least 2)

5. **Set Pricing:**
   - Select price tier
   - Set availability

6. **Submit for Review:**
   - Go to the version you want to submit
   - Click **Add for Review**
   - Review all information
   - Click **Submit for Review**

---

## Common Issues & Solutions

### Issue: "Admin must provide privacy practices"
**Solution:** Make sure you're logged in as an Admin user, or ask an Admin to complete the Privacy Practices section.

### Issue: "Screenshots don't match device size"
**Solution:** Use the exact device sizes specified (6.5-inch iPhone, 13-inch iPad).

### Issue: "Privacy Policy URL not accessible"
**Solution:** Verify the URL is publicly accessible and doesn't require login.

### Issue: "Support URL required"
**Solution:** You can use your privacy policy URL or create a simple support page.

---

## After Completing All Requirements

Once all items are completed:
1. Go to your app version
2. Click **Add for Review**
3. Review the summary
4. Click **Submit for Review**

Apple typically reviews apps within 24-48 hours.

Good luck! 🚀

