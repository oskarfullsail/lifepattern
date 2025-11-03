# LifePattern Frontend - Quick Start

## 🚀 Running with Production Backend (Render)

### Option 1: Use the Restart Script (RECOMMENDED)
```bash
cd frontend
./restart-with-prod.sh
```
This will:
- ✅ Set environment to production
- ✅ Clear all caches
- ✅ Start dev server with production backend

### Option 2: Manual Steps
```bash
cd frontend

# 1. Set to production
./set-env-prod.sh

# 2. Clear caches
rm -rf .expo node_modules/.cache .metro

# 3. Start server
npm start -- --clear

# 4. Press 'w' to open web
```

---

## 🔧 Running with Local Backend (Docker)

```bash
cd frontend
./set-env-dev.sh

# Clear caches
rm -rf .expo node_modules/.cache .metro

# Start server
npm start -- --clear
```

---

## ✅ How to Verify Backend Connection

### Check Console Logs
Look for these messages in the browser console:

**Production Mode (Correct):**
```
🔧 FORCED ENVIRONMENT: PRODUCTION (from env.config.js)
🚀 PRODUCTION MODE (web): Using https://lifepattern-backend.onrender.com
🔗 API Client configured for web with URL: https://lifepattern-backend.onrender.com
```

**Development Mode:**
```
🔧 FORCED ENVIRONMENT: DEVELOPMENT (from env.config.js)
🔧 DEV MODE (Web): Using localhost:8080
🔗 API Client configured for web with URL: http://localhost:8080
```

### Check Network Tab
In Chrome DevTools → Network tab:
- **Production:** Requests should go to `https://lifepattern-backend.onrender.com`
- **Development:** Requests should go to `http://localhost:8080`

---

## ⚠️ Common Issues

### Issue: Still seeing localhost after switching to production

**Solution:**
```bash
# 1. Stop the dev server (Ctrl+C)
# 2. Clear ALL caches
rm -rf .expo node_modules/.cache .metro
# 3. Restart with clear flag
npm start -- --clear
# 4. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
```

### Issue: Backend Connection Failed

**Check backend is running:**
```bash
curl https://lifepattern-backend.onrender.com/health
```

**Expected response:**
```json
{
  "ai_service": "healthy",
  "database": "healthy",
  "status": "healthy",
  "timestamp": "2025-10-20T..."
}
```

### Issue: Changes not taking effect

**Always do these steps after changing environment:**
1. Stop dev server (Ctrl+C)
2. Clear caches: `rm -rf .expo node_modules/.cache .metro`
3. Restart: `npm start -- --clear`
4. Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

---

## 📝 Current Configuration

Check your current environment:
```bash
cat env.config.js | grep FORCE_ENV
```

**Should show:**
- `FORCE_ENV: 'production'` - For Render backend
- `FORCE_ENV: 'development'` - For Docker backend
- `FORCE_ENV: 'auto'` - For automatic detection

---

## 🎯 Quick Commands

```bash
# Switch to production and restart
./restart-with-prod.sh

# Switch to production (manual)
./set-env-prod.sh

# Switch to development
./set-env-dev.sh

# Clear caches
rm -rf .expo node_modules/.cache .metro

# Start with clear cache
npm start -- --clear
```

---

## 📊 Backend URLs

| Environment | URL | Status |
|-------------|-----|--------|
| Production | https://lifepattern-backend.onrender.com | ✅ Live |
| Development | http://localhost:8080 | Docker |
| AI Service (Prod) | https://lifepattern-ai-service.onrender.com | ✅ Live |
| AI Service (Dev) | http://localhost:8000 | Docker |

---

## 💡 Pro Tips

1. **Always clear caches** when switching environments
2. **Check console logs** to verify which backend is being used
3. **Use the restart script** for hassle-free switching
4. **Hard refresh browser** after restarting server
5. **Check Network tab** to see actual API requests

---

**Need more help?** See `ENV_SWITCHING_GUIDE.md` for detailed documentation.
