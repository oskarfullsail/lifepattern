# 🐳 Docker Update Guide - Cross-Device Linking

This guide explains how to use the updated Docker setup with the new **cross-device linking** functionality.

## 🚀 **Quick Start**

### **1. Build and Start All Services**
```bash
# Build and start all services (PostgreSQL, AI Service, Backend)
make docker-compose-up

# Or manually:
docker-compose up -d
```

### **2. Check Service Status**
```bash
# View all running containers
docker-compose ps

# Check logs
make docker-compose-logs
```

### **3. Test the New Functionality**
```bash
# Test cross-device linking endpoints
curl -X POST http://localhost:8080/auth/link/generate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"device_label": "iPhone 15 Pro"}'
```

## 🔧 **Updated Configuration**

### **New Environment Variables**
The Docker setup now includes these new environment variables for cross-device linking:

```yaml
# Cross-Device Linking Configuration
CHALLENGE_EXPIRY=5m          # Mobile challenge expiration
LINK_TOKEN_EXPIRY=10m        # Link token expiration

# JWT Configuration (Required for cross-device linking)
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
JWT_ISSUER=lifepattern
JWT_AUDIENCE=lifepattern-users
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=720h

# WebAuthn Configuration
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=LifePattern
WEBAUTHN_RP_ORIGIN=http://localhost:8080
```

### **Database Schema Updates**
The Docker setup automatically includes the new `link_tokens` table:

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

## 📋 **New API Endpoints in Docker**

### **Protected Endpoints (Require Authentication)**
```bash
# Generate link token and QR code
POST http://localhost:8080/auth/link/generate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "device_label": "iPhone 15 Pro"
}

# Check link token status
GET http://localhost:8080/auth/link/status
Authorization: Bearer <access_token>
```

### **Public Endpoints**
```bash
# Verify link token and create cross-device session
POST http://localhost:8080/auth/link/verify
Content-Type: application/json

{
  "link_token": "abc123def456ghi789",
  "device_label": "iPhone 15 Pro"
}
```

## 🧪 **Testing in Docker Environment**

### **1. Run Cross-Device Linking Tests**
```bash
# Test the new functionality
make test-cross-device

# Or run all tests in Docker
make test-all-docker
```

### **2. Manual Testing**
```bash
# Start services
make docker-compose-up

# Test health endpoint
curl http://localhost:8080/health

# Test cross-device linking (requires authentication first)
# 1. Register/login to get access token
# 2. Generate link token
# 3. Verify link token
```

## 🔄 **Docker Commands**

### **Service Management**
```bash
# Start all services
make docker-compose-up

# Stop all services
make docker-compose-down

# Restart all services
make docker-compose-restart

# View logs
make docker-compose-logs
```

### **Individual Container Management**
```bash
# Build backend only
make docker-build

# Run backend only
make docker-run

# Access backend container
docker-compose exec backend sh

# View backend logs
docker-compose logs backend
```

## 🐛 **Troubleshooting**

### **Common Issues**

#### **1. Database Connection Issues**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

#### **2. Backend Service Issues**
```bash
# Check backend health
curl http://localhost:8080/health

# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

#### **3. Cross-Device Linking Issues**
```bash
# Check if link tokens table exists
docker-compose exec postgres psql -U postgres -d lifepattern -c "\dt link_tokens"

# Check JWT configuration
docker-compose exec backend env | grep JWT
```

### **Reset Everything**
```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Rebuild and start fresh
docker-compose up -d --build
```

## 🔐 **Security Considerations**

### **Production Deployment**
1. **Change JWT Secret**: Update `JWT_SECRET_KEY` in production
2. **Use HTTPS**: Update `WEBAUTHN_RP_ORIGIN` to use HTTPS
3. **Database Security**: Use strong database passwords
4. **Network Security**: Configure proper firewall rules

### **Environment Variables for Production**
```bash
# Create production environment file
cp env.docker env.production

# Edit with production values
JWT_SECRET_KEY=your-actual-production-secret-key
WEBAUTHN_RP_ORIGIN=https://your-domain.com
DATABASE_URL=postgres://user:password@host:port/db?sslmode=require
```

## 📊 **Monitoring**

### **Health Checks**
All services include health checks:
- **PostgreSQL**: `pg_isready`
- **AI Service**: `curl -f http://localhost:8000/health`
- **Backend**: `curl -f http://localhost:8080/health`

### **Logs**
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f ai-service
```

## 🚀 **Deployment Checklist**

- [ ] All services are running (`docker-compose ps`)
- [ ] Health checks are passing (`curl http://localhost:8080/health`)
- [ ] Database migrations are applied
- [ ] Cross-device linking endpoints are accessible
- [ ] JWT configuration is properly set
- [ ] Environment variables are configured
- [ ] Logs show no errors

## 📚 **Additional Resources**

- [Cross-Device Linking Documentation](./CROSS_DEVICE_LINKING.md)
- [API Documentation](./README.md)
- [Database Schema](./migrations/)

---

**Your Docker setup is now ready with full cross-device linking support! 🎉** 