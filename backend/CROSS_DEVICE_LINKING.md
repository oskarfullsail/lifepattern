# 🔗 Cross-Device Linking Implementation

This document explains the **cross-device linking** functionality that enables users to access their data across different platforms (web and mobile) using the same user identity.

## 🎯 **Problem Solved**

**Before:** Users who registered on web couldn't access their data on mobile, and vice versa. Each platform created separate user accounts.

**After:** Users can link their devices and access the same user data across all platforms.

## 🔄 **Supported Scenarios**

### 1. **Web-to-Mobile Linking**
- User registers on web with WebAuthn
- User wants to access data on mobile app
- Generate QR code on web, scan on mobile

### 2. **Mobile-to-Web Linking**
- User registers on mobile with device authentication
- User wants to access data on web browser
- Generate QR code on mobile, scan on web

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    Link Token    ┌─────────────────┐
│   Web Browser   │ ◄──────────────► │  Mobile Device  │
│                 │                  │                 │
│ • WebAuthn Auth │                  │ • Device Auth   │
│ • Generate QR   │                  │ • Scan QR       │
│ • Same User ID  │                  │ • Same User ID  │
└─────────────────┘                  └─────────────────┘
         │                                    │
         │                                    │
         ▼                                    ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend API                          │
│                                                         │
│ • /auth/link/generate (Protected)                      │
│ • /auth/link/verify (Public)                           │
│ • /auth/link/status (Protected)                        │
│                                                         │
│ • LinkToken Management                                 │
│ • Cross-Device Session Creation                        │
│ • Unified User Identity                                │
└─────────────────────────────────────────────────────────┘
```

## 📋 **API Endpoints**

### 1. **Generate Link Token** (Protected)
```http
POST /auth/link/generate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "device_label": "iPhone 15 Pro"
}
```

**Response:**
```json
{
  "token": "abc123def456ghi789",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "expires_at": "2025-08-10T16:30:00Z",
  "device_label": "iPhone 15 Pro"
}
```

### 2. **Verify Link Token** (Public)
```http
POST /auth/link/verify
Content-Type: application/json

{
  "link_token": "abc123def456ghi789",
  "device_label": "iPhone 15 Pro"
}
```

**Response:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "def456ghi789jkl012",
  "expires_in": 900,
  "device_label": "iPhone 15 Pro"
}
```

### 3. **Get Link Status** (Protected)
```http
GET /auth/link/status
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "active_tokens": 1,
  "expires_at": "2025-08-10T16:30:00Z"
}
```

## 🔐 **Security Features**

### **Link Token Security**
- **One-time use**: Each token can only be used once
- **Time-limited**: Tokens expire after 10 minutes
- **Cryptographically secure**: Uses SHA-256 hashing
- **Device-specific**: Includes device label for tracking

### **Cross-Device Session Management**
- **Unified user identity**: Same `user_id` across devices
- **Device-specific credentials**: Each device gets its own credential
- **Session isolation**: Separate sessions per device
- **Revocation support**: Can revoke individual device sessions

## 📱 **Frontend Integration Guide**

### **Web Application Flow**

#### **Step 1: Generate Link Token**
```javascript
// User clicks "Link Mobile Device" button
const response = await fetch('/auth/link/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    device_label: 'iPhone 15 Pro'
  })
});

const { token, qr_code, expires_at } = await response.json();

// Display QR code to user
displayQRCode(qrCode);
```

#### **Step 2: Monitor Link Status**
```javascript
// Poll for link status
const checkStatus = async () => {
  const response = await fetch('/auth/link/status', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const { active_tokens } = await response.json();
  
  if (active_tokens === 0) {
    // Token was used or expired
    hideQRCode();
    showSuccessMessage('Device linked successfully!');
  }
};
```

### **Mobile Application Flow**

#### **Step 1: Scan QR Code**
```javascript
// User scans QR code from web
const qrData = await scanQRCode();
const { token, device } = parseQRCode(qrData);

// Verify link token
const response = await fetch('/auth/link/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    link_token: token,
    device_label: 'iPhone 15 Pro'
  })
});

const { user_id, access_token, refresh_token } = await response.json();

// Store tokens and user ID
await storeAuthTokens(access_token, refresh_token);
await storeUserID(user_id);
```

## 🗄️ **Database Schema**

### **Link Tokens Table**
```sql
CREATE TABLE link_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    device_label VARCHAR(100)
);
```

### **Key Relationships**
- **One-to-Many**: User → Link Tokens
- **One-to-Many**: User → Credentials (per device)
- **One-to-Many**: User → Sessions (per device)

## 🧪 **Testing**

### **Test Scenarios**
1. **Web-to-Mobile Flow**: Complete linking from web to mobile
2. **Mobile-to-Web Flow**: Complete linking from mobile to web
3. **Error Cases**: Invalid tokens, expired tokens, unauthorized access
4. **Security Tests**: Token reuse prevention, expiration handling

### **Run Tests**
```bash
# Run cross-device linking tests
go test ./test -run "TestCrossDeviceLinking" -v

# Run all tests
go test ./... -v
```

## 🚀 **Usage Examples**

### **Scenario 1: User registers on web, wants mobile access**

1. **User registers on web** using WebAuthn
2. **User clicks "Link Mobile Device"** on web dashboard
3. **Web generates QR code** with link token
4. **User opens mobile app** and scans QR code
5. **Mobile app verifies token** and gets same user ID
6. **Both devices now share the same user data**

### **Scenario 2: User registers on mobile, wants web access**

1. **User registers on mobile** using device authentication
2. **User clicks "Link Web Browser"** in mobile app
3. **Mobile generates QR code** with link token
4. **User opens web browser** and scans QR code
5. **Web verifies token** and gets same user ID
6. **Both devices now share the same user data**

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Link token expiry (default: 10 minutes)
LINK_TOKEN_EXPIRY=10m

# Challenge expiry for mobile auth
CHALLENGE_EXPIRY=5m

# JWT token expiry
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=168h  # 7 days
```

## 📊 **Monitoring & Logging**

### **Key Metrics**
- Link token generation rate
- Link token verification success rate
- Cross-device session creation rate
- Token expiration rate

### **Log Messages**
```
✅ Generated link token for user 550e8400-e29b-41d4-a716-446655440000
✅ Saved link token abc123-def456-ghi789 for user 550e8400-e29b-41d4-a716-446655440000
✅ Verified link token abc123-def456-ghi789
✅ Updated link token abc123-def456-ghi789
```

## 🔮 **Future Enhancements**

### **Planned Features**
1. **Multi-device management**: View and manage all linked devices
2. **Device-specific permissions**: Different access levels per device
3. **Push notifications**: Notify when new device is linked
4. **Device verification**: Additional verification for sensitive operations
5. **Link token rotation**: Automatic token refresh for long-lived sessions

### **Security Improvements**
1. **Biometric verification**: Require biometric auth for linking
2. **Geolocation validation**: Verify device location during linking
3. **Device fingerprinting**: Enhanced device identification
4. **Rate limiting**: Prevent brute force attacks on link tokens

## 🤝 **Contributing**

When adding new cross-device linking features:

1. **Update tests**: Add comprehensive test coverage
2. **Update documentation**: Keep this guide current
3. **Security review**: Ensure new features don't compromise security
4. **Performance testing**: Verify scalability of new features

---

**This implementation provides a seamless cross-device experience while maintaining security and user privacy.** 