# Frontend Environment Switching Guide

## 🎯 Quick Switch

### Switch to Production (Render Backend)
```bash
cd frontend
./set-env-prod.sh
# Then restart your dev server
```

### Switch to Development (Docker Backend)
```bash
cd frontend
./set-env-dev.sh
# Then restart your dev server
```

---

## 📝 Manual Configuration

Edit `frontend/env.config.js` and change the `FORCE_ENV` value:

### For Production Mode (Render Backend):
```javascript
module.exports = {
  FORCE_ENV: 'production',  // ← Change this
  // ...
};
```

### For Development Mode (Docker Backend):
```javascript
module.exports = {
  FORCE_ENV: 'development',  // ← Change this
  // ...
};
```

### For Automatic Detection:
```javascript
module.exports = {
  FORCE_ENV: 'auto',  // ← Change this
  // ...
};
```

**⚠️ IMPORTANT:** After changing the config, you MUST restart your dev server!

---

## 🔍 How to Verify Current Environment

### Check Console Logs

When you start the app, look for these logs in the browser console:

**Development Mode:**
```
🔧 FORCED ENVIRONMENT: DEVELOPMENT (from env.config.js)
🔧 DEV MODE (Web): Using localhost:8080
🔗 API Client configured for web with URL: http://localhost:8080
```

**Production Mode:**
```
🔧 FORCED ENVIRONMENT: PRODUCTION (from env.config.js)
🚀 PRODUCTION MODE (web): Using https://lifepattern-backend.onrender.com
🔗 API Client configured for web with URL: https://lifepattern-backend.onrender.com
```

### Test Backend Connection

**Development:**
```bash
curl http://localhost:8080/health
```

**Production:**
```bash
curl https://lifepattern-backend.onrender.com/health
```

---

## 📋 Environment Modes

| Mode | FORCE_ENV Value | Backend URL | Use Case |
|------|----------------|-------------|----------|
| **Development** | `'development'` | `http://localhost:8080` | Local development with Docker |
| **Production** | `'production'` | `https://lifepattern-backend.onrender.com` | Testing with live backend |
| **Auto** | `'auto'` | Automatic detection | Firebase deployment |

---

## 🚀 Common Workflows

### Workflow 1: Local Development with Docker
```bash
# 1. Start Docker backend
cd /Users/oskarsanchez-chagollan/School_Projects/lifepattern
docker-compose up -d backend

# 2. Set frontend to development mode
cd frontend
./set-env-dev.sh

# 3. Start frontend
npm start
# Press 'w' for web

# ✅ Frontend will connect to http://localhost:8080
```

### Workflow 2: Local Development with Production Backend
```bash
# 1. Set frontend to production mode
cd frontend
./set-env-prod.sh

# 2. Start frontend
npm start
# Press 'w' for web

# ✅ Frontend will connect to https://lifepattern-backend.onrender.com
```

### Workflow 3: Deploy to Firebase
```bash
# 1. Set to auto mode (recommended for deployment)
cd frontend
# Edit env.config.js: FORCE_ENV: 'auto'

# 2. Build and deploy
npm run build:web:production
firebase deploy --only hosting

# ✅ Deployed app will automatically use production backend
```

---

## 🔧 Troubleshooting

### Issue: Changes not taking effect

**Solution:**
1. Stop the dev server (Ctrl+C)
2. Clear cache: `rm -rf .expo node_modules/.cache`
3. Restart: `npm start`

### Issue: Still seeing localhost in production

**Check:**
1. Verify `env.config.js` has `FORCE_ENV: 'production'`
2. Restart dev server
3. Check browser console for environment logs
4. Hard refresh browser (Cmd+Shift+R)

### Issue: Backend connection refused

**Development Mode:**
```bash
# Make sure Docker is running
docker-compose ps
docker-compose up -d backend
```

**Production Mode:**
```bash
# Test backend is accessible
curl https://lifepattern-backend.onrender.com/health
```

---

## 📁 Configuration Files

### `frontend/env.config.js`
Main configuration file for environment switching.

### `frontend/app/config/environment.ts`
TypeScript configuration that reads from `env.config.js`.

### `frontend/app/api/client.ts`
API client that uses the environment configuration.

### Helper Scripts:
- `frontend/set-env-dev.sh` - Switch to development mode
- `frontend/set-env-prod.sh` - Switch to production mode

---

## 🎨 Environment Detection Priority

1. **FORCE_ENV** (from `env.config.js`) - Highest priority
2. **Hostname** (for web) - `localhost` vs deployed domain
3. **__DEV__ flag** (for mobile) - Development vs production build
4. **Default** - Falls back to production

---

## 📊 Backend URLs Reference

| Environment | URL | Status |
|-------------|-----|--------|
| Development | `http://localhost:8080` | Docker container |
| Production | `https://lifepattern-backend.onrender.com` | ✅ Live |
| AI Service (Dev) | `http://localhost:8000` | Docker container |
| AI Service (Prod) | `https://lifepattern-ai-service.onrender.com` | ✅ Live |

---

## 💡 Tips

1. **Use Development Mode** when working on features locally
2. **Use Production Mode** when testing with real backend data
3. **Use Auto Mode** for Firebase deployments
4. **Always restart** the dev server after changing environment
5. **Check console logs** to verify which backend you're connected to

---

## 🔒 Security Note

The `env.config.js` file is NOT committed to git (it's in `.gitignore`). This allows each developer to have their own environment configuration without affecting others.

---

## ✅ Quick Checklist

Before starting work:
- [ ] Decide which backend you need (Docker or Render)
- [ ] Run the appropriate `set-env-*.sh` script
- [ ] Restart your dev server
- [ ] Check console logs to verify environment
- [ ] Test backend connection

---

**Need Help?** Check the console logs - they show exactly which backend URL is being used!
