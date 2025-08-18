# AI Service Render Deployment Guide

## 🚀 Overview

This guide covers deploying the LifePattern AI Service to Render, a cloud platform that makes it easy to deploy web services.

## 📋 Prerequisites

- Render account (free tier available)
- GitHub repository with the AI service code
- Docker knowledge (basic)

## 🏗️ Architecture

The AI service will be deployed as a **Web Service** on Render with the following configuration:

- **Environment**: Docker
- **Plan**: Free (or paid for production)
- **Auto-deploy**: Enabled
- **Health checks**: Enabled

## 📁 File Structure

```
ai-service/
├── Dockerfile              # Production Docker configuration
├── requirements.txt        # Python dependencies
├── main.py                # FastAPI application
├── config.py              # Configuration management
├── models/                # ML models and drift detection
├── utils/                 # Utility functions
└── RENDER_DEPLOYMENT.md   # This guide
```

## 🔧 Configuration

### Environment Variables

The following environment variables are configured in Render:

| Variable | Value | Description |
|----------|-------|-------------|
| `PORT` | `8000` | Service port |
| `ENVIRONMENT` | `production` | Environment mode |
| `LOG_LEVEL` | `INFO` | Logging level |
| `DRIFT_WINDOW_SIZE` | `30` | Days for drift detection |
| `DRIFT_THRESHOLD` | `0.05` | Drift detection threshold |

### Health Check

- **Path**: `/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3

## 🚀 Deployment Steps

### 1. Connect Repository

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository containing the AI service

### 2. Configure Service

**Basic Settings:**
- **Name**: `lifepattern-ai-service`
- **Environment**: `Docker`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your deployment branch)

**Build & Deploy:**
- **Build Command**: Leave empty (uses Dockerfile)
- **Start Command**: Leave empty (uses Dockerfile CMD)
- **Dockerfile Path**: `ai-service/Dockerfile`
- **Docker Context**: `.` (root of repository)

### 3. Environment Variables

Add the following environment variables in Render:

```bash
PORT=8000
ENVIRONMENT=production
LOG_LEVEL=INFO
DRIFT_WINDOW_SIZE=30
DRIFT_THRESHOLD=0.05
```

### 4. Advanced Settings

**Health Check:**
- **Path**: `/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3

**Auto-Deploy:**
- ✅ Enable auto-deploy
- ✅ Deploy on push to main branch

## 🔍 Health Check Endpoint

The service provides a health check endpoint at `/health`:

```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_accuracy": 1.0,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 📊 Monitoring

### Logs
- View logs in Render dashboard
- Real-time log streaming available
- Log retention: 30 days (free plan)

### Metrics
- Response time monitoring
- Error rate tracking
- Health check status

## 🔗 API Endpoints

Once deployed, your AI service will be available at:
`https://lifepattern-ai-service.onrender.com`

### Available Endpoints:

1. **Health Check**: `GET /health`
2. **Prediction**: `POST /predict`
3. **Enhanced Prediction**: `POST /predict/enhanced`
4. **Model Info**: `GET /model/info`
5. **Model Retrain**: `POST /model/retrain`

## 🧪 Testing Deployment

### 1. Health Check
```bash
curl https://lifepattern-ai-service.onrender.com/health
```

### 2. Basic Prediction
```bash
curl -X POST https://lifepattern-ai-service.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_hours": 8.0,
    "meal_times": ["07:30", "12:00", "18:30"],
    "screen_time": 4.0,
    "exercise_duration": 1.0,
    "wake_up_time": "07:00",
    "bed_time": "23:00",
    "water_intake": 2.5,
    "stress_level": 4
  }'
```

### 3. Enhanced Prediction
```bash
curl -X POST https://lifepattern-ai-service.onrender.com/predict/enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_hours": 5.0,
    "meal_times": ["08:30", "13:00", "19:30"],
    "screen_time": 8.0,
    "exercise_duration": 0.3,
    "wake_up_time": "08:30",
    "bed_time": "01:00",
    "water_intake": 1.5,
    "stress_level": 7
  }'
```

## 🔄 CI/CD Integration

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Render
        uses: johnbeynon/render-deploy-action@v1.0.0
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Dockerfile syntax
   - Verify requirements.txt
   - Check for missing dependencies

2. **Health Check Failures**
   - Verify `/health` endpoint works
   - Check service startup logs
   - Ensure port configuration is correct

3. **Memory Issues**
   - Free plan has 512MB RAM limit
   - Consider upgrading to paid plan for production
   - Optimize ML model loading

### Debug Commands

```bash
# Check service logs
curl https://lifepattern-ai-service.onrender.com/health

# Test prediction endpoint
curl -X POST https://lifepattern-ai-service.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{"sleep_hours": 8.0, "meal_times": ["07:30"], "screen_time": 4.0, "exercise_duration": 1.0, "wake_up_time": "07:00", "bed_time": "23:00", "water_intake": 2.5, "stress_level": 4}'
```

## 📈 Scaling

### Free Plan Limitations
- 512MB RAM
- 0.1 CPU
- 750 hours/month
- Sleeps after 15 minutes of inactivity

### Paid Plan Benefits
- More RAM and CPU
- Always-on service
- Custom domains
- Better monitoring

## 🔐 Security

### Production Considerations
- Use HTTPS (automatic on Render)
- Implement rate limiting
- Add authentication if needed
- Monitor for abuse

### Environment Variables
- Never commit secrets to code
- Use Render's environment variable system
- Rotate secrets regularly

## 📞 Support

- **Render Documentation**: https://render.com/docs
- **Render Support**: https://render.com/support
- **Service Status**: https://status.render.com

## 🎯 Next Steps

1. **Deploy to Render** using this guide
2. **Test all endpoints** to ensure functionality
3. **Update backend** to use the new AI service URL
4. **Monitor performance** and adjust as needed
5. **Set up alerts** for health check failures

---

**Deployment Status**: ✅ Ready for Render deployment
**Last Updated**: August 2024
**Version**: 1.0.0 