# LifePattern Project - Current Status Overview

## Project Architecture

LifePattern is a **three-tier microservices application** for tracking daily routines and providing AI-powered insights:

1. **Frontend** (React Native/Expo) - Mobile & Web client
2. **Backend** (Go) - RESTful API service with PostgreSQL
3. **AI Service** (Python/FastAPI) - Machine learning microservice

---

## 🎯 Frontend Status (`/frontend`)

### Technology Stack
- **Framework**: React Native with Expo SDK 52
- **Language**: TypeScript
- **Navigation**: React Navigation (Native Stack)
- **State Management**: React Hooks + AsyncStorage
- **HTTP Client**: Axios with interceptors
- **Authentication**: JWT tokens with refresh mechanism
- **Platforms**: iOS, Android, Web

### Key Features Implemented

#### Authentication & User Management
- ✅ Email/password authentication
- ✅ WebAuthn support (passwordless)
- ✅ Mobile device authentication (challenge/response)
- ✅ Cross-device linking via QR codes
- ✅ Device management (view/revoke devices)
- ✅ Password recovery system
- ✅ JWT token refresh with automatic retry
- ✅ Secure token storage (Expo SecureStore)

#### Core Functionality
- ✅ Daily routine logging (sleep, meals, screen time, exercise, water, stress)
- ✅ Quick log interface
- ✅ AI insights display
- ✅ AI productivity insights with screen time monitoring
- ✅ Data visualization (charts and graphs)
- ✅ Data import functionality
- ✅ Watch data module (health data sync)
- ✅ User dashboard
- ✅ Settings and automation configuration

#### Research & Testing Features
- ✅ Screening questionnaire (user qualification)
- ✅ Usability survey (SUS scoring)
- ✅ Admin dashboard

#### Services & Automation
- ✅ AI Productivity Coach service
- ✅ Screen Time Monitor service
- ✅ Smart Reminders service
- ✅ Passive Tracking service
- ✅ Health Sync service

### API Integration
- **Client**: Centralized Axios client (`app/api/client.ts`)
- **Endpoints**: Typed API functions (`app/api/endpoint.ts`)
- **Error Handling**: Automatic token refresh, retry logic, offline support
- **Platform-Specific URLs**: 
  - Web: Environment config
  - iOS: `localhost:8080`
  - Android: `10.0.2.2:8080`

### Current Screens (24 screens)
1. Home
2. Login
3. Register / EnhancedRegister
4. UserDashboard
5. QuickLog
6. AIInsights
7. AIProductivityInsights
8. DataVisualization / EnhancedDataVisualization / SimpleDataVisualization
9. DataImport
10. WatchDataModule / SimpleWatchDataModule
11. Settings
12. AutomationSettings
13. CrossDeviceLinking / EnhancedCrossDeviceLinking / SimpleCrossDeviceLinking
14. DeviceManagement
15. ScreeningQuestionnaire
16. UsabilitySurvey
17. AdminDashboard

### Dependencies Highlights
- React Native 0.76.9
- Expo 52.0.47
- Firebase 11.9.1 (for deployment)
- React Navigation 6.x
- Axios 1.6.7
- Health integrations: `react-native-google-fit`, `rn-apple-healthkit`

---

## 🔧 Backend Status (`/backend`)

### Technology Stack
- **Language**: Go 1.23
- **Framework**: Gorilla Mux (HTTP router)
- **Database**: PostgreSQL with migrations
- **Authentication**: JWT + WebAuthn + Mobile challenge/response
- **Architecture**: Clean layered architecture with dependency injection

### Architecture Layers

```
backend/
├── cmd/server/          # Application entry point
├── internal/
│   ├── api/             # HTTP server & routes
│   ├── auth/             # Authentication (JWT, WebAuthn, Mobile)
│   ├── config/           # Configuration management
│   ├── container/        # Dependency injection
│   ├── database/         # Models & repository pattern
│   ├── handlers/         # HTTP request handlers
│   ├── middleware/       # CORS, logging, recovery, auth
│   ├── services/         # Business logic layer
│   └── utils/            # Utilities
├── migrations/           # SQL migration files
└── test/                 # Integration tests
```

### Key Features Implemented

#### Authentication System (Zero-PII)
- ✅ Username/passphrase authentication (hashed with salt)
- ✅ WebAuthn registration and login
- ✅ Mobile device challenge/response authentication
- ✅ JWT access tokens (15 min expiry)
- ✅ Refresh tokens (30 day expiry)
- ✅ Session management with device tracking
- ✅ Cross-device linking tokens
- ✅ Password recovery with temporary credentials
- ✅ Rate limiting for auth endpoints

#### API Endpoints

**Public Endpoints:**
- `GET /health` - Health check
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `POST /auth/recovery` - Password recovery
- `POST /auth/webauthn/*` - WebAuthn flows
- `POST /auth/mobile/*` - Mobile auth flows
- `POST /auth/link/verify` - Cross-device linking

**Protected Endpoints (require JWT):**
- `POST /api/log` - Create routine log
- `GET /api/logs` - Get user routine logs
- `GET /api/insights` - Get insight for log
- `GET /api/user-insights` - Get user insights
- `POST /api/screening` - Submit screening questionnaire
- `GET /api/screening` - Get screening response
- `POST /api/usability-survey` - Submit usability survey
- `GET /api/usability-surveys` - Get surveys
- `POST /api/device/sync-watch` - Sync watch data
- `GET /api/device/info` - Get device info
- `POST /api/auth/logout` - Logout
- `GET /api/auth/link/status` - Get link tokens
- `POST /api/auth/link/generate` - Generate link token

#### Database Schema

**Core Tables:**
- `users` - User accounts (UUID-based, zero PII)
- `user_credentials` - Username/passphrase (hashed)
- `credentials` - WebAuthn credentials
- `sessions` - Active user sessions
- `link_tokens` - Cross-device linking tokens
- `routine_logs` - Daily routine data
- `ai_reports` - AI analysis results
- `screening_responses` - User screening data
- `usability_survey_responses` - SUS survey data

#### AI Service Integration
- ✅ HTTP client with retry logic (handles 429 rate limits)
- ✅ Service wake-up ping before requests
- ✅ Error handling and fallback
- ✅ Historical data support (for drift detection)
- ✅ Enhanced recommendations support

#### Middleware
- ✅ CORS (configurable origins)
- ✅ Request logging
- ✅ Recovery (panic handling)
- ✅ Authentication (JWT validation)
- ✅ Rate limiting

### Configuration
- Environment-based configuration
- Database connection with retry logic
- AI service URL configuration
- JWT secret key (auto-generated if not provided)
- CORS origins whitelist
- Token expiry settings

### Testing
- Unit tests for services, handlers, middleware
- Integration tests with test database
- Mock implementations for testing
- Test utilities and helpers

---

## 🤖 AI Service Status (`/ai-service`)

### Technology Stack
- **Language**: Python 3.11+
- **Framework**: FastAPI
- **ML Library**: scikit-learn (RandomForestClassifier)
- **Data Processing**: NumPy, Pandas
- **Deployment**: Docker support

### Architecture

```
ai-service/
├── main.py                    # FastAPI application
├── config.py                  # Configuration management
├── models/
│   ├── anomaly_detector.py    # ML model (RandomForest)
│   ├── behavioral_analyzer.py # Behavioral pattern analysis
│   ├── drift_detector_alt.py  # Drift detection (statistical)
│   └── drift_detector.py     # Alternative drift detection
├── utils/
│   ├── content_manager.py     # Content recommendations
│   └── data_generator.py      # Mock data generation
└── requirements.txt
```

### Key Features Implemented

#### Core ML Capabilities
- ✅ **Anomaly Detection**: RandomForestClassifier model
- ✅ **Model Training**: On startup with mock data (1000 samples)
- ✅ **Feature Engineering**: 11 features extracted from routine data
  - sleep_hours, screen_time, exercise_duration, water_intake
  - stress_level, meal_count, wake_up_hour, bed_time_hour
  - sleep_consistency, activity_balance, health_score
- ✅ **Model Evaluation**: Accuracy tracking
- ✅ **Model Retraining**: `/model/retrain` endpoint

#### Behavioral Analysis
- ✅ **Behavioral Context Detection**:
  - Low exercise, High screen time, Late night usage
  - Poor sleep, High stress, Low water intake
  - Irregular meals, Social isolation
- ✅ **Recommendation Types**:
  - Workout videos
  - Inspirational quotes
  - DND (Do Not Disturb) suggestions
  - Social connection prompts
  - Sleep reminders
  - Focus mode, Water reminders, Stress relief

#### Drift Detection
- ✅ Statistical drift detection (PADWIN algorithm)
- ✅ Isolation Forest for anomaly detection
- ✅ Baseline comparison (user-specific)
- ✅ Historical data analysis

#### API Endpoints

**Core Endpoints:**
- `GET /health` - Service health check
- `POST /predict` - Standard anomaly prediction
- `POST /predict/enhanced` - Enhanced prediction with behavioral analysis
- `POST /predict/batch` - Batch prediction for multiple routines
- `POST /model/retrain` - Retrain the ML model
- `GET /model/info` - Get model information

#### Response Structure

**Standard Response:**
```json
{
  "is_anomaly": bool,
  "confidence_score": float,
  "anomaly_type": string,
  "recommendations": string[],
  "enhanced_recommendations": EnhancedRecommendation[],
  "behavioral_contexts": string[],
  "timestamp": string,
  "drift_analysis": object,
  "baseline_comparison": object
}
```

**Enhanced Recommendations:**
- Type, Title, Description
- Action URL (for videos)
- Priority, Context
- Estimated Impact, Time Sensitive flag

#### Anomaly Types Detected
- `insufficient_sleep` (< 6 hours)
- `excessive_sleep` (> 10 hours)
- `excessive_screen_time` (> 10 hours)
- `insufficient_exercise` (< 30 min)
- `low_water_intake` (< 1.5L)
- `high_stress_level` (> 7)
- `irregular_meals` (< 2 meals)
- `multiple_anomalies`
- `normal_routine`

#### Configuration
- Environment-based config (development/production)
- CORS configuration
- Logging levels
- Model path configuration
- Drift detection parameters

### Testing
- Comprehensive test suite
- Enhanced service tests
- Drift detection tests
- Deployment tests
- Quick test utilities

---

## 🔄 Data Flow

### Routine Logging Flow
1. **Frontend** → User submits routine data via `createRoutineLog()`
2. **Backend** → Receives POST `/api/log`, validates, saves to PostgreSQL
3. **Backend** → Calls AI Service `/predict` endpoint
4. **AI Service** → Analyzes data, generates predictions & recommendations
5. **Backend** → Saves AI report to database
6. **Backend** → Returns combined response to frontend
7. **Frontend** → Displays insights to user

### Authentication Flow
1. User registers/logs in via frontend
2. Backend validates credentials (username/passphrase or WebAuthn)
3. Backend generates JWT access token + refresh token
4. Frontend stores tokens securely
5. Frontend includes access token in API requests
6. On 401, frontend automatically refreshes token
7. Sessions tracked in database with device info

---

## 🗄️ Database Schema Summary

### Core Tables
- **users**: UUID-based user accounts
- **user_credentials**: Hashed username/passphrase
- **credentials**: WebAuthn public keys
- **sessions**: Active sessions with refresh tokens
- **routine_logs**: Daily routine data (sleep, meals, exercise, etc.)
- **ai_reports**: AI analysis results with recommendations
- **screening_responses**: User qualification data
- **usability_survey_responses**: SUS survey responses
- **link_tokens**: Cross-device linking

### Key Relationships
- `routine_logs.user_id` → `users.id`
- `ai_reports.routine_log_id` → `routine_logs.id`
- `sessions.user_id` → `users.id`
- `credentials.user_id` → `users.id`

---

## 🚀 Deployment Status

### Frontend
- ✅ Firebase Hosting setup (web)
- ✅ Expo deployment scripts
- ✅ Environment configuration
- ✅ Platform-specific build configs

### Backend
- ✅ Docker support
- ✅ Database migrations system
- ✅ Environment-based configuration
- ✅ Health check endpoints

### AI Service
- ✅ Docker support (Dockerfile + Dockerfile.production)
- ✅ Docker Compose setup
- ✅ Production-ready configuration

---

## 📊 Current Capabilities Summary

### ✅ Fully Implemented
- User authentication (multiple methods)
- Daily routine logging
- AI-powered anomaly detection
- Behavioral pattern analysis
- Enhanced recommendations
- Cross-device linking
- Data visualization
- Health data integration
- Research questionnaires
- Admin dashboard

### 🔄 In Progress / Enhanced Features
- Drift detection (statistical methods implemented)
- Historical data analysis
- Enhanced productivity insights
- Screen time monitoring
- Smart reminders

### 📝 Potential Enhancements
- Real-time notifications
- Advanced ML models
- Predictive analytics
- Social features
- Gamification
- Export/import data
- API rate limiting (frontend)
- Offline-first architecture improvements

---

## 🔐 Security Features

- Zero-PII authentication system
- Password hashing with salt
- JWT token-based authentication
- Refresh token rotation
- WebAuthn passwordless auth
- Device tracking and management
- Session management
- CORS protection
- Rate limiting
- Secure token storage (Expo SecureStore)

---

## 📈 Testing Coverage

### Frontend
- Manual testing scripts
- Backend connection tests
- Endpoint testing utilities

### Backend
- Unit tests (services, handlers, middleware)
- Integration tests
- Test database setup
- Mock implementations

### AI Service
- Service tests
- Enhanced service tests
- Drift detection tests
- Deployment tests

---

## 🛠️ Development Tools

### Frontend
- Expo CLI
- TypeScript
- ESLint
- Firebase CLI

### Backend
- Go modules
- Makefile (build/test commands)
- PostgreSQL migrations
- Docker

### AI Service
- Python virtual environments
- Docker & Docker Compose
- Comprehensive logging

---

## 📝 Notes

- **Zero-PII Design**: Backend uses UUIDs, no personal information stored
- **Microservices**: Backend and AI Service are independently deployable
- **Platform Support**: Frontend supports iOS, Android, and Web
- **Research Focus**: Includes screening and usability survey features
- **Production Ready**: All services have Docker support and deployment configs

---

*Last Updated: Based on current codebase analysis*
*Project: LifePattern - AI-Powered Daily Routine Tracking & Insights*

