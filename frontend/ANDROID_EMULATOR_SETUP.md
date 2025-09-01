# 🎯 Android Emulator Setup Guide

## Quick Setup (10 minutes)

### 1. Install Android Studio
- Download from: https://developer.android.com/studio
- Install with default settings

### 2. Set up Android SDK
1. Open Android Studio
2. Go to **Tools → SDK Manager**
3. Click **SDK Tools** tab
4. Check these items:
   - ✅ Android SDK Platform-Tools
   - ✅ Android Emulator
   - ✅ Android SDK Build-Tools
5. Click **Apply** and install

### 3. Create Virtual Device
1. Go to **Tools → AVD Manager**
2. Click **Create Virtual Device**
3. Choose device: **Pixel 7** (or any recent device)
4. Download system image: **API 34** (Android 14)
5. Click **Next** and **Finish**

### 4. Start Emulator
1. In AVD Manager, click the **play button** next to your device
2. Wait for emulator to fully boot (you'll see the Android home screen)

### 5. Run Your App
```bash
cd frontend
npm run android
```

## Alternative: Physical Device Setup

### 1. Enable Developer Options
- Go to **Settings → About Phone**
- Tap **Build Number** 7 times
- Go back to **Settings → Developer Options**

### 2. Enable USB Debugging
- Turn on **USB Debugging**
- Turn on **Install via USB**

### 3. Connect Device
- Connect via USB cable
- Allow debugging when prompted
- Run: `npm run android`

## Troubleshooting

### If ADB not found:
```bash
# Add to your ~/.zshrc file:
export ANDROID_HOME="/Users/oskarsanchez-chagollan/Library/Android/sdk"
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

# Then reload:
source ~/.zshrc
```

### If emulator won't start:
- Check that virtualization is enabled in BIOS
- Try a different system image (API 33 or 32)
- Increase RAM allocation in AVD settings

### If device not detected:
- Try different USB cable
- Install device drivers
- Check USB debugging is enabled 