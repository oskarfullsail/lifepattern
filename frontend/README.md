# LifePattern AI - React Native Frontend

A React Native application for tracking daily routines and receiving AI-powered insights about lifestyle patterns and anomalies.

## 🚀 Features

### Core Functionality
- **Daily Routine Logging**: Track sleep, meals, screen time, exercise, water intake, stress levels, and mood
- **AI-Powered Analysis**: Receive real-time insights about routine anomalies and patterns
- **Offline Support**: Save data locally when offline, sync when connection is restored
- **Privacy-First**: Optional AI improvement volunteering with clear consent

### User Experience
- **Onboarding Flow**: Guided introduction with privacy explanations
- **Modern UI/UX**: Clean, intuitive interface with smooth animations
- **Real-time Feedback**: Immediate validation and error handling
- **Responsive Design**: Optimized for both mobile and web platforms

### Data Management
- **Firebase Authentication**: Secure user registration and login
- **Firestore Database**: User profiles and preferences storage
- **Backend Integration**: RESTful API communication with Go backend
- **Local Storage**: Offline data persistence with AsyncStorage

## 📱 Screens

### Authentication
- **Home**: Welcome screen with app introduction
- **Login**: Email/password authentication with validation
- **Register**: Account creation with privacy preferences
- **Onboarding**: App explanation and privacy consent

### Main Application
- **Dashboard**: Daily routine logging with form validation
- **Insights**: AI analysis results and recommendations
- **Settings**: User preferences and privacy controls

## 🏗️ Architecture

### Directory Structure
```
frontend/
├── app/
│   ├── api/                    # API integration layer
│   │   ├── client.ts          # Axios HTTP client configuration
│   │   └── endpoint.ts        # Typed API endpoint functions
│   ├── components/            # Reusable UI components
│   ├── screens/              # Screen components
│   │   ├── dashboard.tsx     # Main routine logging interface
│   │   ├── login.tsx         # Authentication screen
│   │   ├── register.tsx      # Account creation screen
│   │   └── onboarding.tsx    # User onboarding flow
│   └── utils/                # Utility functions
├── firebase/                 # Firebase configuration
├── assets/                   # Static assets
├── navigation.tsx           # Navigation configuration
└── App.tsx                  # Root component
```

### API Integration Layer

#### `app/api/client.ts`
Centralized HTTP client configuration using Axios:
- Base URL configuration with environment variable support
- Request/response interceptors for error handling
- Timeout and header configuration
- Extensible for authentication tokens and logging

#### `app/api/endpoint.ts`
Typed API endpoint functions for backend communication:
- **Types**: TypeScript interfaces for request/response data
- **Functions**: 
  - `createRoutineLog()` - Submit daily routine data
  - `getUserRoutineLogs()` - Fetch user's routine history
  - `getInsight()` - Get AI analysis for specific log
  - `getUserInsights()` - Fetch user's AI insights history

### Key Benefits of API Refactoring
1. **Type Safety**: Full TypeScript support with proper interfaces
2. **Centralized Configuration**: Single source for API settings
3. **Error Handling**: Consistent error management across all API calls
4. **Maintainability**: Easy to update endpoints and add new features
5. **Testing**: Simplified mocking and testing of API calls
6. **Scalability**: Clean separation of concerns for future expansion

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Firebase project setup
- Backend API running (see backend README)

### Installation Steps

1. **Clone and Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Firebase Configuration**
   ```bash
   # Copy your Firebase config to firebase/config.ts
   cp firebase/config.example.ts firebase/config.ts
   # Edit with your Firebase project details
   ```

3. **Environment Variables**
   ```bash
   # Set backend API URL (optional, defaults to localhost:8080)
   export BACKEND_API_URL=http://your-backend-url.com
   ```

4. **Start Development Server**
   ```bash
   # For mobile development
   npm start
   
   # For web development
   npm run web
   ```

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Download config and add to `firebase/config.ts`

## 🔧 Configuration

### API Configuration
The API client is configured in `app/api/client.ts`:
```typescript
const BASE_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';
```

### Firebase Configuration
Update `firebase/config.ts` with your project details:
```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## 📊 Data Flow

### Routine Logging Process
1. User fills out daily routine form in Dashboard
2. Form validation ensures data quality
3. Data sent to backend via `createRoutineLog()` API call
4. Backend processes data and triggers AI analysis
5. AI results returned and displayed to user
6. Data stored locally for offline access

### Offline Support
- Form data cached in AsyncStorage when offline
- Automatic sync when connection restored
- Graceful degradation with user feedback

## 🎨 UI/UX Design

### Design Principles
- **Accessibility**: High contrast, readable fonts, touch-friendly targets
- **Consistency**: Unified color scheme and component library
- **Feedback**: Loading states, success/error messages, progress indicators
- **Simplicity**: Clean layouts with intuitive navigation

### Color Palette
- Primary: `#4A90E2` (Blue)
- Secondary: `#2c3e50` (Dark Blue)
- Success: `#27ae60` (Green)
- Warning: `#f39c12` (Orange)
- Error: `#e74c3c` (Red)
- Background: `#f8f9fa` (Light Gray)

## 🔒 Privacy & Security

### Data Protection
- **Local Storage**: Sensitive data encrypted in AsyncStorage
- **Firebase Security**: Firestore security rules protect user data
- **API Security**: HTTPS-only communication with backend
- **User Consent**: Clear opt-in/opt-out for AI improvement

### Privacy Features
- **Volunteer Mode**: Optional anonymized data sharing for AI improvement
- **Data Ownership**: Users control their data and can delete accounts
- **Transparency**: Clear explanations of data usage and storage

## 🧪 Testing

### Unit Testing
```bash
npm test
```

### Integration Testing
```bash
npm run test:integration
```

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Daily routine form submission
- [ ] Offline functionality
- [ ] AI insights display
- [ ] Privacy settings
- [ ] Error handling

## 🚀 Deployment

### Web Deployment
```bash
# Build for web
npm run build:web

# Deploy to Firebase Hosting
npm run deploy
```

### Mobile Deployment
```bash
# Build for iOS/Android
expo build:ios
expo build:android
```

## 🔄 API Integration

### Backend Communication
The frontend communicates with the Go backend through RESTful APIs:

#### Routine Logging
```typescript
// Submit daily routine
const result = await createRoutineLog({
  user_id: 1,
  sleep_hours: 7.5,
  meal_times: ["07:00", "12:00", "19:00"],
  screen_time: 4.5,
  exercise_duration: 0.5,
  wake_up_time: "07:00",
  bed_time: "23:00",
  water_intake: 2.5,
  stress_level: 5,
  log_date: "2024-01-15"
});
```

#### Data Retrieval
```typescript
// Get user's routine history
const logs = await getUserRoutineLogs(userId, 10);

// Get AI insights
const insights = await getUserInsights(userId, 5);
```

### Error Handling
- Network errors with retry logic
- Validation errors with user-friendly messages
- Offline fallback with local storage
- Graceful degradation for API failures

## 📈 Performance Optimization

### Code Splitting
- Lazy loading of screens
- Dynamic imports for heavy components
- Bundle size optimization

### Caching Strategy
- API response caching
- Image and asset caching
- Offline data persistence

### Memory Management
- Proper cleanup of event listeners
- Image optimization and lazy loading
- Efficient state management

## 🐛 Troubleshooting

### Common Issues

**Firebase Connection Errors**
- Verify Firebase configuration
- Check network connectivity
- Ensure Firebase project is active

**API Communication Issues**
- Verify backend is running
- Check API URL configuration
- Review network requests in dev tools

**Build Errors**
- Clear node_modules and reinstall
- Update Expo CLI to latest version
- Check TypeScript configuration

### Debug Mode
```bash
# Enable debug logging
export DEBUG=true
npm start
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- Follow TypeScript best practices
- Use functional components with hooks
- Implement proper error handling
- Add comprehensive tests
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the backend documentation
- Contact the development team

---

**LifePattern AI** - Empowering users to understand and optimize their daily routines through AI-powered insights. 