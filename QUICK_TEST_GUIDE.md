# ⚡ QUICK TEST GUIDE - Backend & AI Service

## 🎯 Goal
Test if backend can communicate with AI service locally, then compare with Render.

---

## 📝 CURRENT STATUS

**You're building containers now with:**
```bash
./test-containers.sh
```

This will take 5-10 minutes for first build.

---

## 🚀 QUICK MANUAL TESTS (While Waiting)

### Test 1: AI Service Standalone (Python)

```bash
cd ai-service

# Install dependencies (if not done)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run AI service
python main.py
```

**In another terminal:**
```bash
# Test health
curl http://localhost:8000/health

# Test prediction
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

**Expected:** JSON response with `is_anomaly`, `recommendations`, etc.

---

### Test 2: Backend Standalone (Go)

```bash
cd backend

# Set environment variables
export DATABASE_URL="postgres://postgres:password@localhost:5432/lifepattern?sslmode=disable"
export AI_SERVICE_URL="http://localhost:8000"
export JWT_SECRET_KEY="test-secret"
export PORT=8080

# Run backend
go run ./cmd/server/main.go
```

**Expected logs:**
```
🔔 Pinging AI service to ensure it's awake...
✅ AI service is awake and ready
```

---

## 🐳 AFTER DOCKER BUILD COMPLETES

### Check Container Status

```bash
cd /Users/oskarsanchez-chagollan/School_Projects/lifepattern

# See running containers
docker compose -f docker-compose.test.yml ps

# Should show:
# - test-db (healthy)
# - test-ai (healthy)
# - test-backend (healthy)
```

### Test AI Service (from host)

```bash
# Health check
curl http://localhost:8001/health

# Prediction
curl -X POST http://localhost:8001/predict \
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

### Test Backend (from host)

```bash
# Health check
curl http://localhost:8081/health
```

### Test Backend → AI Communication (from inside backend container)

```bash
# Can backend reach AI service?
docker exec test-backend curl -v http://test-ai:8000/health

# Can backend call prediction?
docker exec test-backend curl -X POST http://test-ai:8000/predict \
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

### Check Logs

```bash
# AI Service logs (look for POST /predict)
docker compose -f docker-compose.test.yml logs test-ai

# Backend logs (look for "AI service" messages)
docker compose -f docker-compose.test.yml logs test-backend

# Live logs
docker compose -f docker-compose.test.yml logs -f test-ai
docker compose -f docker-compose.test.yml logs -f test-backend
```

---

## 🔍 WHAT TO LOOK FOR

### ✅ SUCCESS - AI Service Logs:
```
INFO: "GET /health HTTP/1.1" 200 OK
INFO: "POST /predict HTTP/1.1" 200 OK  ← THIS!
```

### ✅ SUCCESS - Backend Logs:
```
🔔 Pinging AI service to ensure it's awake...
✅ AI service is awake and ready
🤖 Sending routine data to AI service
📥 Received response from AI service (status: 200)
✅ Successfully processed AI service response
```

### ❌ FAIL - No Communication:
```
# AI Service: Only health checks, no /predict
# Backend: Connection refused or timeouts
```

---

## 📊 RENDER vs LOCAL COMPARISON

### After Local Tests Work:

| Aspect | Local Docker | Render |
|--------|--------------|--------|
| AI Service URL | `http://test-ai:8000` | `https://lifepattern-ai-service.onrender.com` |
| Network | Docker bridge | Internet |
| Auth | None | None (but possible rate limits) |
| Cold Starts | No | Yes (15min inactivity) |
| Rate Limits | No | Yes (free tier) |

**If local works but Render doesn't:**
- ✅ Code is correct
- ❌ Render has environment/network issues
- Need to check Render-specific config

---

## 🛠️ TROUBLESHOOTING

### Containers Won't Start

```bash
# Check Docker resources
docker system df
docker system prune -a  # Clean up if needed

# Rebuild from scratch
docker compose -f docker-compose.test.yml down -v
docker compose -f docker-compose.test.yml build --no-cache
docker compose -f docker-compose.test.yml up -d
```

### Backend Can't Reach AI Service

```bash
# Check network
docker network inspect docker-compose_test-network

# Check DNS resolution
docker exec test-backend nslookup test-ai

# Check connectivity
docker exec test-backend ping -c 3 test-ai
```

### AI Service Not Responding

```bash
# Check if it's running
docker ps | grep test-ai

# Check logs for errors
docker compose -f docker-compose.test.yml logs test-ai

# Restart it
docker compose -f docker-compose.test.yml restart test-ai
```

---

## 📞 QUICK COMMANDS REFERENCE

```bash
# Build and start
./test-containers.sh

# Check status
docker compose -f docker-compose.test.yml ps

# View logs
docker compose -f docker-compose.test.yml logs -f test-ai
docker compose -f docker-compose.test.yml logs -f test-backend

# Stop
docker compose -f docker-compose.test.yml down

# Clean restart
docker compose -f docker-compose.test.yml down -v
docker compose -f docker-compose.test.yml up -d --build

# Shell into containers
docker exec -it test-backend sh
docker exec -it test-ai-service sh
```

---

## 🎯 NEXT STEPS

1. ✅ Wait for `./test-containers.sh` to complete
2. ✅ Check logs for communication
3. ✅ Test manually with curl commands above
4. ✅ Compare with Render logs
5. 💡 Identify the difference!

**The goal is to prove:**
- ✅ Local: Backend CAN reach AI service
- ❌ Render: Backend CANNOT reach AI service (or rate limited)

Then we know it's a Render-specific issue!

