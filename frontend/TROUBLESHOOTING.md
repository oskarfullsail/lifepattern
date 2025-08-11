# Frontend Troubleshooting Guide

## 🔗 Backend Connection Issues

### Problem: "Create Account" button doesn't work or shows connection errors

### Solution Steps:

#### 1. **Check Docker Backend Status**
```bash
# Navigate to the project root
cd /Users/oskarsanchez-chagollan/School_Projects/lifepattern

# Check if Docker containers are running
docker-compose ps

# Expected output should show:
# - lifepattern-backend (healthy)
# - lifepattern-ai-service (healthy) 
# - lifepattern-postgres (healthy)
```

#### 2. **Start Docker Backend (if not running)**
```bash
# Start all services
docker-compose up -d

# Check logs for any errors
docker-compose logs backend
```

#### 3. **Test Backend Health**
```bash
# Test the health endpoint directly
curl http://localhost:8080/health

# Expected response:
# {
#   "ai_service": "healthy",
#   "database": "healthy", 
#   "status": "healthy",
#   "timestamp": "2025-08-10T..."
# }
```

#### 4. **Check Frontend Environment**

The frontend automatically detects the correct backend URL based on your platform:

- **Web Browser**: `http://localhost:8080`
- **iOS Simulator**: `http://localhost:8080`
- **Android Emulator**: `http://10.0.2.2:8080`

#### 5. **Manual Backend URL Override**

If automatic detection doesn't work, you can override the backend URL:

**For Web Development:**
```bash
# Set environment variable
export BACKEND_API_URL=http://localhost:8080
npm start
```

**For Mobile Development:**
```bash
# iOS Simulator
export BACKEND_API_URL=http://localhost:8080
npm run ios

# Android Emulator  
export BACKEND_API_URL=http://10.0.2.2:8080
npm run android
```

#### 6. **Check Network Connectivity**

**For iOS Simulator:**
- iOS Simulator should automatically connect to `localhost:8080`
- If it doesn't work, try using your Mac's IP address

**For Android Emulator:**
- Android Emulator uses `10.0.2.2` to access the host machine
- This is automatically configured in the API client

**For Web Browser:**
- Make sure you're not blocking localhost connections
- Check browser console for CORS errors

#### 7. **Common Error Messages & Solutions**

**Error: "Connection refused"**
```bash
# Solution: Start Docker backend
docker-compose up -d
```

**Error: "Host not found"**
```bash
# Solution: Check if backend is running on correct port
docker-compose ps
curl http://localhost:8080/health
```

**Error: "CORS error" (Web only)**
- ✅ **FIXED**: CORS is now properly configured in the backend
- The backend handles CORS automatically for all endpoints
- If you still see CORS errors, restart the backend: `docker-compose restart backend`

**Error: "500 Internal Server Error" or "failed to create user"**
- ✅ **FIXED**: Database schema has been updated to match the current code
- The `last_seen_at` column issue has been resolved
- If you see this error again, restart the backend: `docker-compose restart backend`

**Error: "getDeviceInfo was not found"**
- ✅ **FIXED**: Device info API has been implemented
- Supports Android, iOS, and Web browser detection
- Backend endpoint: `/api/device/info`
- If you see this error, restart the backend: `docker-compose restart backend`

#### 8. **Debug Connection Issues**

The frontend now includes connection status indicators:

1. **Dashboard**: Look for connection badge in header (🔗 = connected, ❌ = failed)
2. **Enhanced Registration**: Connection status is shown at the top
3. **Console Logs**: Check browser/device console for detailed error messages

#### 9. **Reset Everything**

If all else fails:

```bash
# Stop all services
docker-compose down

# Remove all containers and volumes
docker-compose down -v

# Rebuild and start
docker-compose up -d --build

# Check status
docker-compose ps
```

#### 10. **Verify Backend Features**

Once connected, test these endpoints:

```bash
# Health check
curl http://localhost:8080/health

# Cross-device linking (should return error for invalid token)
curl -X POST http://localhost:8080/auth/link/verify \
  -H "Content-Type: application/json" \
  -d '{"link_token": "test", "device_label": "test"}'
```

## 🐛 Other Common Issues

### Problem: "Module not found" errors
```bash
# Solution: Install dependencies
npm install
```

### Problem: TypeScript compilation errors
```bash
# Solution: Check TypeScript configuration
npx tsc --noEmit
```

### Problem: Expo development server issues
```bash
# Solution: Clear cache and restart
npx expo start --clear
```

## 📞 Getting Help

If you're still experiencing issues:

1. **Check the logs**: Look at browser console and Docker logs
2. **Verify Docker**: Make sure Docker Desktop is running
3. **Check ports**: Ensure port 8080 is not used by another service
4. **Restart everything**: Sometimes a full restart helps

## 🔧 Development Tips

### For Web Development:
- Use browser developer tools to see network requests
- Check the Network tab for failed API calls
- Look for CORS errors in the console

### For Mobile Development:
- Use React Native Debugger for better debugging
- Check device/simulator logs
- Test on both iOS and Android if possible

### For Docker Development:
- Use `docker-compose logs -f` to follow logs in real-time
- Check container health with `docker-compose ps`
- Restart individual services if needed: `docker-compose restart backend` 