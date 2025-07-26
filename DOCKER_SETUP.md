# 🐳 LifePattern Docker Setup

This document explains how to run LifePattern services using Docker containers.

## 📋 Prerequisites

- **Docker Desktop** installed and running
- **Docker Compose** (usually comes with Docker Desktop)
- **Git** for cloning the repository

## 🚀 Quick Start

### 1. Start All Services

```bash
# Make the startup script executable (if not already)
chmod +x start-services.sh

# Start all services
./start-services.sh
```

This will:
- Build and start PostgreSQL database
- Build and start AI Service (Python/FastAPI)
- Build and start Backend Service (Go)
- Run health checks on all services

### 2. Test Services

```bash
# Make the test script executable (if not already)
chmod +x test-services.sh

# Test all services
./test-services.sh
```

## 🏗️ Service Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Backend   │    │ AI Service  │
│  (React/    │◄──►│   (Go)      │◄──►│  (Python)   │
│   Mobile)   │    │   :8080     │    │   :8000     │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                           ▼
                   ┌─────────────┐
                   │ PostgreSQL  │
                   │   :5432     │
                   └─────────────┘
```

## 📊 Service Details

### Backend Service (Go)
- **Port**: 8080
- **Health Check**: `http://localhost:8080/health`
- **API Documentation**: Available at health endpoint
- **Database**: PostgreSQL
- **AI Integration**: Communicates with AI Service

### AI Service (Python/FastAPI)
- **Port**: 8000
- **Health Check**: `http://localhost:8000/health`
- **API Documentation**: `http://localhost:8000/docs`
- **Features**: Anomaly detection, drift analysis
- **ML Models**: RandomForest, PADWIN, Isolation Forest

### PostgreSQL Database
- **Port**: 5432
- **Database**: lifepattern
- **User**: postgres
- **Password**: password
- **Migrations**: Auto-applied on startup

## 🛠️ Development Commands

### Start Services
```bash
# Start all services in background
docker-compose up -d

# Start with logs
docker-compose up

# Rebuild and start
docker-compose up --build
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f ai-service
docker-compose logs -f postgres
```

### Access Services
```bash
# Access backend container
docker exec -it lifepattern-backend sh

# Access AI service container
docker exec -it lifepattern-ai-service bash

# Access database
docker exec -it lifepattern-postgres psql -U postgres -d lifepattern
```

## 🧪 Testing

### Manual API Testing

#### Test Backend Health
```bash
curl http://localhost:8080/health
```

#### Test AI Service Health
```bash
curl http://localhost:8000/health
```

#### Create Routine Log
```bash
curl -X POST http://localhost:8080/log \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "sleep_hours": 7.5,
    "meal_times": ["07:30", "12:00", "18:30"],
    "screen_time": 4.5,
    "exercise_duration": 1.0,
    "wake_up_time": "07:00",
    "bed_time": "23:00",
    "water_intake": 2.5,
    "stress_level": 4,
    "log_date": "2024-01-15"
  }'
```

#### Test AI Prediction
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_hours": 8.0,
    "meal_times": ["07:30", "12:00", "18:30"],
    "screen_time": 4.5,
    "exercise_duration": 1.0,
    "wake_up_time": "07:00",
    "bed_time": "23:00",
    "water_intake": 2.5,
    "stress_level": 4
  }'
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
PORT=8080
HOST=0.0.0.0
DATABASE_URL=postgres://postgres:password@postgres:5432/lifepattern?sslmode=disable
AI_SERVICE_URL=http://ai-service:8000
DEBUG=true
LOG_LEVEL=info
```

#### AI Service
```env
PORT=8000
PYTHONPATH=/app
```

### Database Configuration
- **Host**: postgres (internal) / localhost (external)
- **Port**: 5432
- **Database**: lifepattern
- **Username**: postgres
- **Password**: password

## 🐛 Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check Docker is running
docker info

# Check available ports
lsof -i :8080
lsof -i :8000
lsof -i :5432

# View detailed logs
docker-compose logs
```

#### Database Connection Issues
```bash
# Check database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test database connection
docker exec -it lifepattern-postgres pg_isready -U postgres
```

#### AI Service Issues
```bash
# Check AI service logs
docker-compose logs ai-service

# Check model loading
docker exec -it lifepattern-ai-service python -c "from models.anomaly_detector import AnomalyDetector; print('Model loaded successfully')"
```

#### Backend Issues
```bash
# Check backend logs
docker-compose logs backend

# Test backend health
curl http://localhost:8080/health
```

### Reset Everything
```bash
# Stop and remove everything
docker-compose down -v

# Remove all images
docker rmi lifepattern-backend lifepattern-ai-service

# Start fresh
./start-services.sh
```

## 📈 Monitoring

### Health Checks
All services include health checks that run every 30 seconds:
- **Backend**: `http://localhost:8080/health`
- **AI Service**: `http://localhost:8000/health`
- **PostgreSQL**: Internal health check

### Logs
```bash
# Real-time logs
docker-compose logs -f

# Service-specific logs
docker-compose logs -f backend
docker-compose logs -f ai-service
```

## 🚀 Production Considerations

For production deployment, consider:

1. **Environment Variables**: Use proper secrets management
2. **Database**: Use managed PostgreSQL service
3. **Networking**: Configure proper firewall rules
4. **Monitoring**: Add application monitoring
5. **Backup**: Set up database backups
6. **SSL**: Configure HTTPS endpoints

## 📝 Next Steps

1. **Start services**: `./start-services.sh`
2. **Test services**: `./test-services.sh`
3. **Run frontend**: Start your React Native app
4. **Begin development**: Start implementing features

---

**Happy Coding! 🎉** 