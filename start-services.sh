#!/bin/bash

# LifePattern Services Startup Script
echo "🚀 Starting LifePattern Services..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it first."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."

# Check PostgreSQL
echo "📊 Checking PostgreSQL..."
if curl -f http://localhost:5432 > /dev/null 2>&1; then
    echo "✅ PostgreSQL is running"
else
    echo "⚠️  PostgreSQL health check failed (this might be normal for PostgreSQL)"
fi

# Check AI Service
echo "🤖 Checking AI Service..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ AI Service is running"
else
    echo "❌ AI Service health check failed"
fi

# Check Backend
echo "⚙️  Checking Backend..."
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "❌ Backend health check failed"
fi

echo ""
echo "🎉 Services are starting up!"
echo ""
echo "📱 Frontend: http://localhost:19006 (if running with Expo)"
echo "⚙️  Backend API: http://localhost:8080"
echo "🤖 AI Service: http://localhost:8000"
echo "🗄️  PostgreSQL: localhost:5432"
echo ""
echo "📋 Useful commands:"
echo "  docker-compose logs -f          # View all logs"
echo "  docker-compose logs backend     # View backend logs"
echo "  docker-compose logs ai-service  # View AI service logs"
echo "  docker-compose down             # Stop all services"
echo "" 