# LifePattern Backend API

A scalable Golang backend service that integrates with the AI microservice to analyze daily routine data and provide insights.

## Architecture

The backend follows a clean, layered architecture:

```
backend/
├── cmd/server/           # Application entry point
├── internal/             # Private application code
│   ├── config/          # Configuration management
│   ├── database/        # Data models and repository
│   ├── handlers/        # HTTP request handlers
│   ├── services/        # Business logic layer
│   └── middleware/      # HTTP middleware
├── migrations/          # Database migrations
├── test/               # Integration tests
└── pkg/                # Public packages (if any)
```

## Features

- **RESTful API**: Clean HTTP endpoints for routine logs and insights
- **Database Integration**: PostgreSQL with proper indexing and constraints
- **AI Service Integration**: Seamless communication with Python AI microservice
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Proper error responses and logging
- **CORS Support**: Cross-origin request handling
- **Health Monitoring**: Service health checks
- **Scalable Architecture**: Clean separation of concerns
- **Comprehensive Testing**: Unit, integration, and end-to-end tests

## API Endpoints

### Health Check
```
GET /health
```
Returns service status including database and AI service health.

**Response:**
```json
{
  "status": "healthy",
  "database": "healthy",
  "ai_service": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Create Routine Log
```
POST /log
```
Creates a new routine log and triggers AI analysis.

**Request Body:**
```json
{
  "user_id": 1,
  "sleep_hours": 8.0,
  "meal_times": ["07:30", "12:00", "18:30"],
  "screen_time": 4.5,
  "exercise_duration": 1.0,
  "wake_up_time": "07:00",
  "bed_time": "23:00",
  "water_intake": 2.5,
  "stress_level": 4,
  "log_date": "2024-01-15"
}
```

**Response:**
```json
{
  "log_id": 123,
  "message": "Routine log saved and analyzed",
  "has_ai": true,
  "ai_result": {
    "is_anomaly": false,
    "confidence_score": 0.89,
    "anomaly_type": "normal_routine"
  }
}
```

### Get User Routine Logs
```
GET /logs?user_id=1&limit=10
```
Retrieves routine logs for a specific user.

**Response:**
```json
{
  "user_id": 1,
  "logs": [...],
  "count": 5
}
```

### Get Insight
```
GET /insights?log_id=123
```
Retrieves a specific routine log with its AI analysis.

**Response:**
```json
{
  "routine_log": {
    "id": 123,
    "user_id": 1,
    "sleep_hours": 8.0,
    "meal_times": ["07:30", "12:00", "18:30"],
    "screen_time": 4.5,
    "exercise_duration": 1.0,
    "wake_up_time": "07:00",
    "bed_time": "23:00",
    "water_intake": 2.5,
    "stress_level": 4,
    "log_date": "2024-01-15",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "ai_report": {
    "id": 456,
    "routine_log_id": 123,
    "is_anomaly": false,
    "confidence_score": 0.89,
    "anomaly_type": "normal_routine",
    "recommendations": ["Your daily routine looks healthy! Keep up the good work."],
    "created_at": "2024-01-15T10:30:05Z"
  }
}
```

## Installation & Setup

### Prerequisites
- Go 1.21+
- PostgreSQL 12+
- AI Service running on localhost:8000

### 1. Clone and Setup
```bash
cd backend
cp env.example .env
# Edit .env with your configuration
```

### 2. Install Dependencies
```bash
make deps
# or manually:
go mod tidy
```

### 3. Setup Database
```bash
# Create database
createdb lifepattern

# Run migrations
make db-migrate
# or manually:
psql -d lifepattern -f migrations/001_initial_schema.sql
```

### 4. Run the Application
```bash
make run
# or manually:
go run cmd/server/main.go
```

## Testing

The backend includes comprehensive testing with unit tests, integration tests, and test utilities.

### Test Structure
```
backend/
├── internal/
│   ├── config/config_test.go      # Configuration tests
│   ├── database/repository_test.go # Database tests
│   ├── handlers/
│   │   ├── health_test.go         # Health handler tests
│   │   ├── insights_test.go       # Insights handler tests
│   │   └── logs_test.go           # Logs handler tests
│   ├── middleware/cors_test.go    # CORS middleware tests
│   └── services/
│       ├── ai_service_test.go     # AI service tests
│       └── routine_service_test.go # Routine service tests
├── test/
│   ├── integration_test.go        # Integration tests
│   └── helpers.go                 # Test utilities
└── Makefile                      # Test commands
```

### Running Tests

#### All Tests
```bash
make test
```

#### Unit Tests Only
```bash
make test-unit
```

#### Integration Tests Only
```bash
make test-integration
```

#### Tests with Coverage
```bash
make test-coverage
```

#### Specific Test
```bash
make test-specific TEST=TestCreateRoutineLog
```

#### Verbose Test Output
```bash
make test-verbose
```

### Test Database Setup
```bash
# Setup test database
make test-db-reset

# Or manually:
createdb lifepattern_test
psql -d lifepattern_test -f migrations/001_initial_schema.sql
```

### Test Environment Variables
```bash
# Set test database URL
export TEST_DATABASE_URL="postgres://postgres:password@localhost:5432/lifepattern_test?sslmode=disable"
```

### Test Types

#### Unit Tests
- **Configuration**: Environment variable handling and default values
- **Database**: Repository operations with mock data
- **Services**: Business logic with mocked dependencies
- **Handlers**: HTTP request/response handling
- **Middleware**: CORS and other middleware functionality

#### Integration Tests
- **End-to-end flows**: Complete request processing
- **Database integration**: Real database operations
- **Error handling**: Service failure scenarios
- **Validation**: Input validation and error responses

#### Mock Testing
- **Repository mocks**: In-memory data storage for testing
- **AI service mocks**: Simulated AI service responses
- **HTTP mocks**: Mock HTTP servers for external service testing

### Test Coverage
The test suite aims for high coverage across all layers:
- **Unit tests**: >90% coverage
- **Integration tests**: Critical path coverage
- **Error scenarios**: Comprehensive error handling tests

## Configuration

Environment variables in `.env`:

```env
# Server Configuration
PORT=8080
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=postgres://postgres:password@localhost:5432/lifepattern?sslmode=disable

# AI Service Configuration
AI_SERVICE_URL=http://localhost:8000
```

## Database Schema

### Users Table
- `id`: Primary key
- `username`: Unique username
- `email`: Unique email
- `created_at`, `updated_at`: Timestamps

### Routine Logs Table
- `id`: Primary key
- `user_id`: Foreign key to users
- `sleep_hours`: Hours of sleep (0-24)
- `meal_times`: JSON array of meal timestamps
- `screen_time`: Hours of screen time (0-24)
- `exercise_duration`: Hours of exercise (0-24)
- `wake_up_time`: Wake up time (HH:MM format)
- `bed_time`: Bed time (HH:MM format)
- `water_intake`: Liters of water consumed
- `stress_level`: Stress level (1-10)
- `log_date`: Date of the log
- `created_at`, `updated_at`: Timestamps

### AI Reports Table
- `id`: Primary key
- `routine_log_id`: Foreign key to routine_logs
- `is_anomaly`: Boolean anomaly flag
- `confidence_score`: AI confidence (0-1)
- `anomaly_type`: Type of anomaly detected
- `recommendations`: JSON array of recommendations
- `ai_service_response`: Full AI service response
- `created_at`: Timestamp

## Development

### Project Structure
```
backend/
├── cmd/server/main.go           # Application entry point
├── internal/
│   ├── config/config.go         # Configuration management
│   ├── database/
│   │   ├── models.go            # Data models
│   │   └── repository.go        # Database operations
│   ├── handlers/
│   │   ├── health.go            # Health check handler
│   │   ├── insights.go          # Insights handler
│   │   └── logs.go              # Logs handler
│   ├── services/
│   │   ├── ai_service.go        # AI service integration
│   │   ├── routine_service.go   # Business logic
│   │   └── interfaces.go        # Service interfaces
│   └── middleware/
│       └── cors.go              # CORS middleware
├── migrations/
│   └── 001_initial_schema.sql   # Database schema
├── test/
│   ├── integration_test.go      # Integration tests
│   └── helpers.go               # Test utilities
├── go.mod                       # Go modules
├── Makefile                     # Build and test commands
├── env.example                  # Environment template
└── README.md                    # This file
```

### Adding New Features
1. **New Endpoints**: Add handlers in `internal/handlers/`
2. **Business Logic**: Add services in `internal/services/`
3. **Database Changes**: Create new migrations in `migrations/`
4. **Configuration**: Update `internal/config/config.go`
5. **Tests**: Add corresponding tests for new functionality

### Code Quality
```bash
# Format code
make fmt

# Run linter
make lint

# Run security scan
make security
```

## Testing

### Manual Testing
```bash
# Health check
curl http://localhost:8080/health

# Create routine log
curl -X POST http://localhost:8080/log \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "sleep_hours": 8.0,
    "meal_times": ["07:30", "12:00", "18:30"],
    "screen_time": 4.5,
    "exercise_duration": 1.0,
    "wake_up_time": "07:00",
    "bed_time": "23:00",
    "water_intake": 2.5,
    "stress_level": 4
  }'

# Get insights
curl "http://localhost:8080/insights?log_id=1"
```

## Production Deployment

For production deployment, consider:
- Using environment variables for all configuration
- Setting up proper logging
- Implementing authentication and authorization
- Using a production database
- Setting up monitoring and alerting
- Using HTTPS
- Implementing rate limiting
- Setting up CI/CD pipelines
- Running comprehensive tests before deployment

## Integration with AI Service

The backend communicates with the Python AI microservice:
1. Receives routine log data from frontend
2. Saves data to PostgreSQL
3. Sends data to AI service for analysis
4. Saves AI analysis results
5. Returns combined response to frontend

This design allows for:
- Independent scaling of services
- Fault tolerance (backend works even if AI service is down)
- Easy testing and development
- Clear separation of concerns 