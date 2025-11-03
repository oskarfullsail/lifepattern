# 🔬 LOCAL TESTING GUIDE

## 🎯 EMERGENCY TESTING - Backend ↔ AI Service Communication

This guide helps you test the full integration locally to understand why Render isn't working.

---

## 🚀 QUICK START

### 1. **Run Complete Integration Test**

```bash
cd /Users/oskarsanchez-chagollan/School_Projects/lifepattern
./test-local-integration.sh
```

This script will:
- ✅ Start all services in Docker
- ✅ Test AI service directly
- ✅ Test backend directly  
- ✅ Test backend → AI service communication
- ✅ Check logs for actual requests
- ✅ Verify environment variables

---

## 📋 MANUAL TESTING STEPS

### Step 1: Start Services

```bash
# From project root
docker-compose up --build
```

**Watch for:**
- ✅ "lifepattern-postgres" container running
- ✅ "lifepattern-ai-service" container running
- ✅ "lifepattern-backend" container running

---

### Step 2: Test AI Service Directly

```bash
# Health check
curl http://localhost:8000/health

# Prediction test
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_hours": 7.5,
    "meal_times": ["08:00", "12:30", "19:00"],
    "screen_time": 5.0,
    "exercise_duration": 1.5,
    "wake_up_time": "07:00",
    "bed_time": "23:00",
    "water_intake": 2.5,
    "stress_level": 5
  }'
```

**Expected:**
```json
{
  "is_anomaly": false,
  "confidence_score": 0.95,
  "recommendations": [...],
  ...
}
```

---

### Step 3: Test Backend Directly

```bash
# Health check
curl http://localhost:8080/health

# Expected: {"status":"healthy",...}
```

---

### Step 4: Test from Inside Backend Container

```bash
# Can backend reach AI service?
docker exec lifepattern-backend curl -s http://ai-service:8000/health

# Expected: {"status":"healthy",...}

# Can backend call predict endpoint?
docker exec lifepattern-backend curl -s -X POST http://ai-service:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_hours": 7.5,
    "meal_times": ["08:00"],
    "screen_time": 5.0,
    "exercise_duration": 1.5,
    "wake_up_time": "07:00",
    "bed_time": "23:00",
    "water_intake": 2.5,
    "stress_level": 5
  }'
```

**Expected:** Full AI response with recommendations

---

### Step 5: Check Environment Variables

```bash
# Check backend AI_SERVICE_URL
docker exec lifepattern-backend printenv AI_SERVICE_URL

# Expected: http://ai-service:8000

# Check all backend env vars
docker exec lifepattern-backend printenv | grep -E 'AI_SERVICE|DATABASE|JWT'
```

---

### Step 6: Watch Live Logs

```bash
# All services
docker-compose logs -f

# Just AI service
docker-compose logs -f ai-service

# Just backend
docker-compose logs -f backend

# Search for specific patterns
docker-compose logs backend | grep "AI service"
docker-compose logs ai-service | grep "POST /predict"
```

---

## 🔍 WHAT TO LOOK FOR

### ✅ **SUCCESS INDICATORS**

#### AI Service Logs:
```
INFO: "GET /health HTTP/1.1" 200 OK
INFO: "POST /predict HTTP/1.1" 200 OK  ← THIS IS KEY!
```

#### Backend Logs:
```
🔔 Pinging AI service to ensure it's awake...
✅ AI service is awake and ready
🤖 Sending routine data to AI service at http://ai-service:8000/predict
📤 Sending request to AI service: {...}
📥 Received response from AI service (status: 200): {...}
✅ Successfully processed AI service response
```

---

### ❌ **FAILURE INDICATORS**

#### AI Service Never Receives Requests:
```
# Only health checks, no predictions
INFO: "GET /health HTTP/1.1" 200 OK
INFO: "GET /health HTTP/1.1" 200 OK
# NO "POST /predict" lines!
```

#### Backend Can't Reach AI Service:
```
❌ Failed to call AI service: dial tcp: lookup ai-service: no such host
❌ Failed to call AI service: connection refused
⚠️ AI service wake-up ping failed
```

#### Wrong URL:
```
# Backend trying wrong URL
🤖 Sending routine data to AI service at http://localhost:8000/predict
# Should be: http://ai-service:8000/predict
```

---

## 🐛 DEBUGGING STEPS

### 1. **Check Container Status**

```bash
docker-compose ps

# All should show "Up" and "healthy"
```

### 2. **Check Network Connectivity**

```bash
# Can containers ping each other?
docker exec lifepattern-backend ping -c 3 ai-service

# Can backend resolve ai-service hostname?
docker exec lifepattern-backend nslookup ai-service

# Can backend curl AI service?
docker exec lifepattern-backend curl -v http://ai-service:8000/health
```

### 3. **Check Docker Network**

```bash
# List networks
docker network ls

# Inspect lifepattern network
docker network inspect lifepattern-network

# All 3 containers should be listed
```

### 4. **Restart Services**

```bash
# Clean restart
docker-compose down -v
docker-compose up --build

# Or restart just one service
docker-compose restart backend
docker-compose restart ai-service
```

### 5. **Check for Port Conflicts**

```bash
# Check if ports are in use
lsof -i :8000  # AI service
lsof -i :8080  # Backend
lsof -i :5434  # PostgreSQL
```

---

## 🧪 TESTING EACH AI HANDLER

### Test 1: Health Check

```bash
curl http://localhost:8000/health
```

**Expected:**
```json
{"status":"healthy","model_loaded":true}
```

---

### Test 2: Simple Prediction

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_hours": 6,
    "meal_times": ["08:00"],
    "screen_time": 8,
    "exercise_duration": 0.5,
    "wake_up_time": "08:00",
    "bed_time": "02:00",
    "water_intake": 1,
    "stress_level": 8
  }'
```

**Expected:**
- `is_anomaly`: true (poor sleep, high stress)
- `recommendations`: array of suggestions
- `behavioral_contexts`: ["poor_sleep", "late_night_usage", ...]

---

### Test 3: Good Routine (No Anomaly)

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_hours": 8,
    "meal_times": ["08:00", "12:30", "19:00"],
    "screen_time": 3,
    "exercise_duration": 1.5,
    "wake_up_time": "07:00",
    "bed_time": "23:00",
    "water_intake": 2.5,
    "stress_level": 3
  }'
```

**Expected:**
- `is_anomaly`: false (healthy routine)
- `confidence_score`: high (>0.9)
- `anomaly_type`: "no_anomaly"

---

### Test 4: Extreme Values

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_hours": 3,
    "meal_times": [],
    "screen_time": 15,
    "exercise_duration": 0,
    "wake_up_time": "12:00",
    "bed_time": "04:00",
    "water_intake": 0.5,
    "stress_level": 10
  }'
```

**Expected:**
- `is_anomaly`: true (severe issues)
- `confidence_score`: very high (≈1.0)
- `anomaly_type`: "multiple_anomalies"
- `behavioral_contexts`: multiple flags

---

## 📊 COMPARE: LOCAL vs RENDER

### Local Environment:
```
Backend: http://localhost:8080
AI Service: http://localhost:8000
Communication: http://ai-service:8000 (Docker network)
```

### Render Environment:
```
Backend: https://lifepattern-backend.onrender.com
AI Service: https://lifepattern-ai-service.onrender.com
Communication: https://lifepattern-ai-service.onrender.com
```

**Key Differences:**
1. ✅ Local: Direct Docker network (fast, reliable)
2. ⚠️ Render: HTTP over internet (rate limits, cold starts)
3. ✅ Local: No authentication between services
4. ⚠️ Render: Possible network policies

---

## 🎯 EXPECTED OUTCOMES

### ✅ **If Local Works:**
1. Backend CAN reach AI service
2. AI service CAN process requests
3. Code logic is correct
4. **Problem is with Render configuration/network**

### ❌ **If Local Fails:**
1. Code has bugs
2. Configuration issues
3. Need to fix locally first before deploying

---

## 🚀 NEXT STEPS AFTER LOCAL TEST

### If Local Works:
1. ✅ Code is fine
2. 🔍 Check Render environment variables
3. 🔍 Check Render network policies
4. 🔍 Check Render logs for different errors
5. 💡 Consider Render support/upgrade

### If Local Fails:
1. ❌ Fix code issues
2. ❌ Fix Docker configuration
3. ✅ Test locally until working
4. ✅ Then deploy to Render

---

## 📞 QUICK COMMANDS REFERENCE

```bash
# Start everything
docker-compose up --build

# Stop everything
docker-compose down

# Clean restart (removes volumes)
docker-compose down -v && docker-compose up --build

# View logs
docker-compose logs -f

# Run integration test
./test-local-integration.sh

# Shell into backend
docker exec -it lifepattern-backend sh

# Shell into AI service
docker exec -it lifepattern-ai-service sh

# Check network
docker network inspect lifepattern-network
```

---

## 🎉 SUCCESS CRITERIA

You'll know it's working when you see:

1. ✅ AI service logs show: `POST /predict HTTP/1.1 200 OK`
2. ✅ Backend logs show: `✅ Successfully processed AI service response`
3. ✅ Test script shows: `ALL TESTS PASSED! 🎉`
4. ✅ Manual curl tests return AI recommendations

**Then you know the issue is Render-specific, not your code!**

