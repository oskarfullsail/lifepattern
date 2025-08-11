# 🚀 Backend Deployment Guide - Render.com

## Overview
This guide will help you deploy the LifePattern backend to Render.com, a free cloud platform.

## Prerequisites
- GitHub account with the LifePattern repository
- Render.com account (free)

## Step 1: Prepare Repository

### 1.1 Push to GitHub
Make sure your code is pushed to GitHub:
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 1.2 Verify Files
Ensure these files are in your repository:
- `render.yaml` (deployment configuration)
- `backend/Dockerfile` (container configuration)
- `backend/env.render` (production environment)

## Step 2: Deploy to Render.com

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Verify your email

### 2.2 Create New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select the LifePattern repository

### 2.3 Configure Service
- **Name**: `lifepattern-backend`
- **Environment**: `Docker`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: Leave empty (uses root)
- **Build Command**: Leave empty (uses Dockerfile)
- **Start Command**: Leave empty (uses Dockerfile CMD)

### 2.4 Set Environment Variables
Add these environment variables:

| Key | Value | Description |
|-----|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/lifepattern` | Database connection (will be updated) |
| `JWT_SECRET` | `[Generate random string]` | JWT signing secret |
| `PORT` | `8080` | Application port |
| `ENVIRONMENT` | `production` | Environment flag |
| `CORS_ORIGIN` | `https://lifepattern-ai-dc5fe.web.app` | Frontend URL |

### 2.5 Deploy
1. Click "Create Web Service"
2. Wait for build to complete (5-10 minutes)
3. Note the service URL (e.g., `https://lifepattern-backend.onrender.com`)

## Step 3: Set Up Database

### 3.1 Create PostgreSQL Database
1. In Render dashboard, click "New +" → "PostgreSQL"
2. Name: `lifepattern-db`
3. Database: `lifepattern`
4. User: `postgres`
5. Region: Same as web service

### 3.2 Update Web Service
1. Go back to your web service
2. Add environment variable:
   - Key: `DATABASE_URL`
   - Value: Copy from PostgreSQL service (Internal Database URL)

### 3.3 Run Migrations
The application will automatically run migrations on startup.

## Step 4: Update Frontend

### 4.1 Update Environment Configuration
Update `frontend/app/config/environment.ts`:
```typescript
production: {
  backendUrl: 'https://your-backend-url.onrender.com',
  apiTimeout: 30000,
},
```

### 4.2 Redeploy Frontend
```bash
cd frontend
npm run deploy
```

## Step 5: Test Deployment

### 5.1 Health Check
Visit: `https://your-backend-url.onrender.com/health`
Should return: `{"status":"healthy"}`

### 5.2 Test Registration
1. Go to frontend: `https://lifepattern-ai-dc5fe.web.app`
2. Click "Create New Account"
3. Try the registration flow

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check Dockerfile syntax
   - Verify all files are committed to GitHub

2. **Database Connection Fails**
   - Verify DATABASE_URL is correct
   - Check PostgreSQL service is running

3. **CORS Errors**
   - Verify CORS_ORIGIN matches frontend URL
   - Check frontend environment configuration

4. **Health Check Fails**
   - Check application logs in Render dashboard
   - Verify PORT environment variable

### Logs
- View logs in Render dashboard
- Check "Logs" tab in your web service

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for JWT token signing |
| `PORT` | Yes | Application port (8080) |
| `ENVIRONMENT` | Yes | Environment name (production) |
| `CORS_ORIGIN` | Yes | Frontend URL for CORS |

## Cost
- **Free Tier**: 750 hours/month
- **Web Service**: Free
- **PostgreSQL**: Free (90 days, then $7/month)

## Next Steps
1. Set up custom domain (optional)
2. Configure monitoring
3. Set up CI/CD pipeline
4. Add SSL certificates (automatic with Render)

## Support
- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com 