# 🚀 Quick Logout Fix - Copy & Paste Ready

## ⚡ 1-Minute Fix

### Add this to your UserDashboard (or any screen with logout):

```typescript
// In userDashboard.tsx

import userManager from './utils/userManager';

// Add this function:
const handleLogout = async () => {
  Alert.alert(
    'Logout',
    'Are you sure you want to logout?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('🚪 Logging out...');
            
            // NEW: Proper logout with backend call
            await userManager.logoutCompletely();
            
            console.log('✅ Logged out successfully');
            
            // Navigate to login screen
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
            
          } catch (error) {
            console.error('❌ Logout failed:', error);
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        }
      }
    ]
  );
};

// Add logout button to your UI:
<TouchableOpacity 
  style={styles.logoutButton}
  onPress={handleLogout}
>
  <Text style={styles.logoutButtonText}>🚪 Logout</Text>
</TouchableOpacity>

// Styles:
logoutButton: {
  backgroundColor: '#ff4444',
  padding: 15,
  borderRadius: 10,
  margin: 20,
  alignItems: 'center',
},
logoutButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
},
```

---

## ⚡ Auto-Refresh on App Load

### Add this to your `App.tsx` or `navigation.tsx`:

```typescript
import { useEffect } from 'react';
import userManager from './app/utils/userManager';

// At the top of your component:
useEffect(() => {
  initializeSession();
}, []);

const initializeSession = async () => {
  try {
    console.log('🔄 Checking session...');
    
    const status = await userManager.initializeSession();
    
    if (status.wasRefreshed) {
      console.log('✅ Got fresh token');
    }
    
    if (status.needsLogin) {
      console.log('🔐 Need to login');
      // User will be redirected to login by auth check
    }
    
  } catch (error) {
    console.error('❌ Session init failed:', error);
  }
};
```

---

## 🧪 Test It

1. **Add the logout button** to your dashboard
2. **Click logout**
3. **Check console:** Should see `✅ Backend session revoked`
4. **Try to access dashboard** → Redirected to login
5. **Login again** → Gets fresh new token

---

## ✅ What This Does

### Before (Broken):
```
1. Logout → Only clears local data
2. Backend session still active
3. Old token still works
4. Can reuse old tokens ❌
```

### After (Fixed):
```
1. Logout → Calls backend to revoke session
2. Backend invalidates token
3. Clears ALL local data
4. Old tokens don't work anymore ✅
5. Must login to get fresh token
```

---

## 📊 Bonus: Add Session Status to Debug Panel

```typescript
<TouchableOpacity onPress={async () => {
  const status = await userManager.initializeSession();
  Alert.alert(
    'Session Status',
    `Valid: ${status.isValid}\nNeeds Login: ${status.needsLogin}\nWas Refreshed: ${status.wasRefreshed}`
  );
}}>
  <Text>🔍 Check Session</Text>
</TouchableOpacity>
```

---

## 🎯 Summary

**Copy the code above** and:
1. Add `handleLogout()` function to your dashboard
2. Add logout button with the function
3. Add `initializeSession()` to app startup
4. Test it!

**Your logout will work and you'll get fresh tokens every time!** 🚀

