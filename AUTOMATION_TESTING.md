# Automation Features Testing Guide
## iOS & Android Compatibility Test Plan

---

## Overview

This guide provides step-by-step testing procedures for all automation features in LifePattern AI on both iOS and Android platforms.

### Automation Features to Test:
1. 🔔 Smart Reminders (Daily Notifications)
2. 🏥 Background Health Sync (Apple Health / Google Fit)
3. 📡 Passive Tracking (Device Usage Patterns)

---

## Pre-Testing Setup

### iOS Setup Requirements
```bash
# 1. Install on iOS device (not simulator - push notifications don't work in simulator)
npm install
npx expo run:ios --device

# 2. Ensure Expo Go is installed OR build standalone app
# 3. iOS version: 13.0 or higher
# 4. Apple Health app must be installed (comes with iOS)
```

### Android Setup Requirements
```bash
# 1. Install on Android device
npm install
npx expo run:android --device

# 2. Android version: 6.0 (API 23) or higher
# 3. Google Fit or Health Connect installed (optional but recommended)
```

---

## Test Suite 1: Smart Reminders 🔔

### Purpose
Test daily notification system for health check-ins (morning/evening)

### iOS Testing Steps

#### Test 1.1: Enable Reminders (iOS)
**Steps:**
1. Open LifePattern app
2. Login to your account
3. Navigate: Dashboard → "Automation" button
4. Toggle ON "Smart Reminders" switch
5. When prompted, tap "Allow" for notifications

**Expected Result:**
- [ ] Alert appears: "Permissions Required" → Tap "Allow"
- [ ] iOS system dialog appears requesting notification permission
- [ ] After allowing, success message: "Smart reminders enabled!"
- [ ] Switch stays ON
- [ ] Details expand showing Morning/Evening times

**Pass/Fail:** ______

**Screenshot iOS Notification Permission:**
![](screenshots/ios-notification-permission.png)

---

#### Test 1.2: Receive Morning Reminder (iOS)
**Steps:**
1. Set device time to 7:59 AM (or change morning time in code to current time + 1 min)
2. Lock device
3. Wait 2 minutes

**Expected Result:**
- [ ] Notification appears at 8:00 AM
- [ ] Notification shows: "Morning Check-in"
- [ ] Notification body: "How are you feeling? Log your morning routine"
- [ ] Tap notification → Opens app to data entry

**Pass/Fail:** ______

**Screenshot iOS Morning Notification:**
![](screenshots/ios-morning-notification.png)

---

#### Test 1.3: Receive Evening Reminder (iOS)
**Steps:**
1. Set device time to 8:59 PM
2. Lock device
3. Wait 2 minutes

**Expected Result:**
- [ ] Notification appears at 9:00 PM
- [ ] Notification shows: "Evening Check-in"
- [ ] Notification body: "How was your day? Log your evening routine"
- [ ] Tap notification → Opens app to data entry

**Pass/Fail:** ______

---

### Android Testing Steps

#### Test 1.4: Enable Reminders (Android)
**Steps:**
1. Open LifePattern app
2. Login to your account
3. Navigate: Dashboard → "Automation" button
4. Toggle ON "Smart Reminders" switch
5. When prompted, tap "Allow" for notifications

**Expected Result:**
- [ ] Android notification permission dialog appears
- [ ] After allowing, success message: "Smart reminders enabled!"
- [ ] Switch stays ON
- [ ] Details expand showing Morning/Evening times

**Pass/Fail:** ______

**Screenshot Android Notification Permission:**
![](screenshots/android-notification-permission.png)

---

#### Test 1.5: Receive Morning Reminder (Android)
**Steps:**
1. Set device time to 7:59 AM (or modify time in settings)
2. Lock device
3. Wait 2 minutes

**Expected Result:**
- [ ] Notification appears at 8:00 AM
- [ ] Shows on lock screen
- [ ] Tap notification → Opens app

**Pass/Fail:** ______

---

#### Test 1.6: Disable Reminders
**Steps:**
1. In Automation Settings
2. Toggle OFF "Smart Reminders"
3. Wait for scheduled time

**Expected Result:**
- [ ] Alert: "Smart reminders disabled"
- [ ] No notifications received at scheduled times
- [ ] Details section collapses

**Pass/Fail:** ______

---

## Test Suite 2: Background Health Sync 🏥

### Purpose
Test automatic syncing from Apple Health (iOS) and Google Fit (Android)

### iOS Testing Steps

#### Test 2.1: Enable Health Sync (iOS)
**Steps:**
1. Ensure Apple Health has some data (steps, sleep, heart rate)
2. In Automation Settings
3. Toggle ON "Background Health Sync"
4. Tap "Test Sync Now" in alert

**Expected Result:**
- [ ] iOS Health permission dialog appears
- [ ] Lists permissions: Steps, Sleep, Heart Rate, etc.
- [ ] Tap "Allow All"
- [ ] Alert: "Health Sync Enabled"
- [ ] After test: "Health data synced successfully!" OR "No health data available"
- [ ] Status shows: "Available"
- [ ] Last Sync shows: "X minutes ago"

**Pass/Fail:** ______

**Screenshot iOS Health Permissions:**
![](screenshots/ios-health-permissions.png)

---

#### Test 2.2: Verify Health Data Sync (iOS)
**Steps:**
1. Open Apple Health app
2. Add some health data (e.g., log steps: 5000)
3. Return to LifePattern
4. In Automation Settings, tap "Refresh Settings"
5. Check Last Sync time

**Expected Result:**
- [ ] Last Sync updates to "Just now" or "X minutes ago"
- [ ] Health data appears in LifePattern dashboard
- [ ] Sync interval shows: "4 hours" (or configured value)

**Pass/Fail:** ______

---

#### Test 2.3: Background Fetch (iOS)
**Steps:**
1. With Health Sync enabled
2. Close app completely
3. Wait 4 hours (or use iOS simulator debug → Simulate Background Fetch)
4. Check backend for new health data entries

**Expected Result:**
- [ ] Background fetch status: "Available"
- [ ] After 4 hours, new sync occurs automatically
- [ ] Data appears in backend without opening app

**Pass/Fail:** ______

**Notes:**
iOS Background Fetch is limited by system. May not occur exactly every 4 hours.

---

### Android Testing Steps

#### Test 2.4: Enable Health Sync (Android)
**Steps:**
1. Ensure Google Fit or Health Connect has data
2. In Automation Settings
3. Toggle ON "Background Health Sync"
4. Tap "Test Sync Now"

**Expected Result:**
- [ ] Android permissions dialog for Google Fit/Health Connect
- [ ] Request access to activity data
- [ ] Alert: "Health Sync Enabled"
- [ ] Test sync: Success or "No data" message
- [ ] Status: "Available"

**Pass/Fail:** ______

**Screenshot Android Health Permissions:**
![](screenshots/android-health-permissions.png)

---

#### Test 2.5: Verify Health Data Sync (Android)
**Steps:**
1. Open Google Fit app
2. Add activity (e.g., walk 30 minutes)
3. Return to LifePattern
4. Tap "Refresh Settings"

**Expected Result:**
- [ ] Last Sync updates
- [ ] Activity data syncs to LifePattern
- [ ] Shows in dashboard or data import screen

**Pass/Fail:** ______

---

#### Test 2.6: Disable Health Sync
**Steps:**
1. Toggle OFF "Background Health Sync"
2. Close app
3. Wait for sync interval (4 hours)

**Expected Result:**
- [ ] Alert: "Health Sync Disabled"
- [ ] No background syncs occur
- [ ] Status shows: "Disabled" or "Unknown"

**Pass/Fail:** ______

---

## Test Suite 3: Passive Tracking 📡

### Purpose
Test device usage pattern collection (screen time, app usage)

### iOS Testing Steps

#### Test 3.1: Enable Passive Tracking (iOS)
**Steps:**
1. In Automation Settings
2. Toggle ON "Passive Tracking"
3. Grant Screen Time permissions if prompted

**Expected Result:**
- [ ] Alert: "Passive Tracking Enabled"
- [ ] Message: "Your device will passively collect usage patterns"
- [ ] Details expand showing:
   - Collections: 0 (initially)
   - Last Collection: "Never"
   - Data impact: "+500% more data points"

**Pass/Fail:** ______

---

#### Test 3.2: Verify Collection (iOS)
**Steps:**
1. Use device normally for 1 hour
2. Return to Automation Settings
3. Tap "Refresh Settings"

**Expected Result:**
- [ ] Collections counter increases: "1", "2", etc.
- [ ] Last Collection updates: "X minutes ago"
- [ ] Data includes: screen time, app usage, device pickups

**Pass/Fail:** ______

---

### Android Testing Steps

#### Test 3.3: Enable Passive Tracking (Android)
**Steps:**
1. In Automation Settings
2. Toggle ON "Passive Tracking"
3. Grant Usage Access permission (Android 6+)

**Expected Result:**
- [ ] Android Usage Access settings screen opens
- [ ] Enable "LifePattern" in the list
- [ ] Return to app
- [ ] Alert: "Passive Tracking Enabled"
- [ ] Details expand

**Pass/Fail:** ______

**Screenshot Android Usage Access:**
![](screenshots/android-usage-access.png)

---

#### Test 3.4: Verify Collection (Android)
**Steps:**
1. Use device for 1 hour
2. Return to Automation Settings
3. Refresh

**Expected Result:**
- [ ] Collections increment
- [ ] Last Collection updates
- [ ] Stats show device usage patterns

**Pass/Fail:** ______

---

## Test Suite 4: Integration Tests

### Test 4.1: All Features Enabled
**Steps:**
1. Enable all three automation features:
   - Smart Reminders: ON
   - Health Sync: ON
   - Passive Tracking: ON
2. Use app normally for 24 hours
3. Check data generation

**Expected Result:**
- [ ] Receive 2 notifications (morning + evening)
- [ ] Health data syncs 6 times (every 4 hours)
- [ ] Passive tracking collects hourly
- [ ] Data impact card shows: "1000x more data"
- [ ] All features work without conflicts

**Pass/Fail:** ______

---

### Test 4.2: Battery Impact
**Steps:**
1. With all features enabled
2. Monitor battery usage for 24 hours
3. Check Settings → Battery → App Usage

**Expected Result:**
- [ ] iOS: LifePattern uses < 5% battery per day
- [ ] Android: LifePattern uses < 5% battery per day
- [ ] No excessive wake locks
- [ ] No overheating

**Pass/Fail:** ______

---

### Test 4.3: Data Privacy
**Steps:**
1. Check what data is collected
2. Verify encryption
3. Test data deletion

**Expected Result:**
- [ ] Privacy section shows: "All data is encrypted end-to-end"
- [ ] User can see what's collected
- [ ] User can disable any feature
- [ ] Deleting data works (Settings → Delete Data)

**Pass/Fail:** ______

---

## Test Suite 5: Edge Cases

### Test 5.1: Airplane Mode
**Steps:**
1. Enable all automation features
2. Turn on Airplane Mode
3. Wait for scheduled events

**Expected Result:**
- [ ] Notifications still fire locally
- [ ] Health sync queues data for later
- [ ] When back online, queued data syncs
- [ ] No crashes or errors

**Pass/Fail:** ______

---

### Test 5.2: App Force Quit
**Steps:**
1. Enable all features
2. Force quit app (swipe up on iOS, clear from recents on Android)
3. Wait for scheduled events

**Expected Result:**
- [ ] Notifications still work (scheduled by OS)
- [ ] Background sync may be delayed
- [ ] App recovers gracefully when reopened

**Pass/Fail:** ______

---

### Test 5.3: Low Storage
**Steps:**
1. Fill device storage to < 500MB
2. Enable passive tracking
3. Let it collect data

**Expected Result:**
- [ ] App handles low storage gracefully
- [ ] Shows warning if can't save data
- [ ] Doesn't crash
- [ ] Suggests clearing old data

**Pass/Fail:** ______

---

### Test 5.4: Permission Revocation
**Steps:**
1. Enable all features
2. Go to device Settings → Apps → LifePattern
3. Revoke all permissions (Notifications, Health, Usage)
4. Return to app

**Expected Result:**
- [ ] App detects missing permissions
- [ ] Shows alerts: "Permissions Required"
- [ ] Toggles turn OFF automatically
- [ ] Prompts to re-enable permissions

**Pass/Fail:** ______

---

## Platform-Specific Checks

### iOS Only

#### Test iOS.1: Dark Mode Compatibility
**Steps:**
1. Enable Dark Mode in iOS Settings
2. Open Automation Settings

**Expected Result:**
- [ ] All UI elements visible
- [ ] Text readable
- [ ] Colors adapt properly

**Pass/Fail:** ______

---

#### Test iOS.2: Dynamic Type
**Steps:**
1. Settings → Accessibility → Larger Text
2. Increase text size to maximum
3. Open Automation Settings

**Expected Result:**
- [ ] Text scales properly
- [ ] No text truncation
- [ ] UI still usable

**Pass/Fail:** ______

---

### Android Only

#### Test Android.1: Different Android Versions
Test on:
- [ ] Android 13+ (Health Connect)
- [ ] Android 10-12 (Google Fit)
- [ ] Android 6-9 (Google Fit legacy)

**Expected Result:**
- [ ] Health sync adapts to available API
- [ ] Notifications work on all versions
- [ ] Passive tracking uses appropriate APIs

**Pass/Fail:** ______

---

#### Test Android.2: Battery Optimization
**Steps:**
1. Settings → Battery → Battery Optimization
2. Find LifePattern
3. Set to "Optimize" (restricted)
4. Test background features

**Expected Result:**
- [ ] App detects battery optimization
- [ ] Warns user: "Background features may be limited"
- [ ] Provides link to disable optimization
- [ ] Features still work (may be delayed)

**Pass/Fail:** ______

---

## Performance Metrics

### Expected Benchmarks

| Feature | iOS Battery Impact | Android Battery Impact | Data Collection Rate |
|---------|-------------------|------------------------|---------------------|
| Smart Reminders | < 1% per day | < 1% per day | 2 events/day |
| Health Sync | 1-3% per day | 1-3% per day | 6 syncs/day (4hr) |
| Passive Tracking | 1-2% per day | 2-4% per day | 24 collections/day |
| **All Enabled** | **< 5% per day** | **< 6% per day** | **1000x baseline** |

---

## Troubleshooting Common Issues

### Issue 1: Notifications Not Appearing
**Possible Causes:**
- Permissions not granted
- Do Not Disturb enabled
- Notification settings disabled

**Fix:**
1. Check Settings → Notifications → LifePattern → Ensure enabled
2. Check Do Not Disturb schedule
3. Re-toggle Smart Reminders

---

### Issue 2: Health Sync Not Working
**iOS:**
- Check Settings → Health → Data Access → LifePattern → Ensure all categories enabled
- Ensure Apple Health has recent data

**Android:**
- Check Google Fit or Health Connect is installed
- Grant all health permissions
- Ensure Google Fit has recent activity

---

### Issue 3: Passive Tracking Shows 0 Collections
**iOS:**
- Check Settings → Screen Time → See All Activity → Apps & Websites
- Ensure Screen Time is enabled

**Android:**
- Check Settings → Apps → Special Access → Usage Access → LifePattern enabled
- May take 1 hour for first collection

---

## Automated Test Scripts

### Run Tests with Detox (E2E Framework)

```bash
# Install Detox
npm install -g detox-cli
npm install --save-dev detox

# Run automation tests
detox test --configuration ios.sim.debug
detox test --configuration android.emu.debug
```

### Test Script: automation.test.js
```javascript
describe('Automation Settings', () => {
  beforeAll(async () => {
    await device.launchApp();
    await device.reloadReactNative();
  });

  it('should toggle smart reminders', async () => {
    await element(by.text('Automation')).tap();
    await element(by.id('smart-reminders-toggle')).tap();
    await expect(element(by.text('Smart reminders enabled!'))).toBeVisible();
  });

  it('should toggle health sync', async () => {
    await element(by.id('health-sync-toggle')).tap();
    await expect(element(by.text('Health Sync Enabled'))).toBeVisible();
  });

  it('should toggle passive tracking', async () => {
    await element(by.id('passive-tracking-toggle')).tap();
    await expect(element(by.text('Passive Tracking Enabled'))).toBeVisible();
  });
});
```

---

## Test Summary Report Template

### Test Session Information
- **Tester Name:** _______________
- **Date:** _______________
- **Device:** iOS/Android _______________
- **OS Version:** _______________
- **App Version:** _______________

### Results Summary

| Test Category | Tests Passed | Tests Failed | Pass Rate |
|---------------|--------------|--------------|-----------|
| Smart Reminders | __/6 | __ | __% |
| Health Sync | __/6 | __ | __% |
| Passive Tracking | __/4 | __ | __% |
| Integration | __/3 | __ | __% |
| Edge Cases | __/4 | __ | __% |
| **TOTAL** | **__/23** | **__** | **__%** |

### Critical Issues Found
1. _______________
2. _______________
3. _______________

### Recommendations
1. _______________
2. _______________

### Sign-off
**Tester Signature:** _______________
**Date:** _______________

---

## Quick Test Checklist (30-minute smoke test)

For rapid testing on new devices:

- [ ] Enable Smart Reminders → Get permission
- [ ] Enable Health Sync → Get permission → Test sync
- [ ] Enable Passive Tracking → Get permission
- [ ] Check all toggles stay ON after refresh
- [ ] Disable all features → Toggles turn OFF
- [ ] No crashes or errors
- [ ] Battery usage reasonable (<5%)

**Result:** PASS / FAIL

---

**Last Updated:** November 10, 2025
**Version:** 1.0.0
**Platforms:** iOS 13+, Android 6+
