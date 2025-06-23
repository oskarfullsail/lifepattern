# LifePattern AI

A React Native app built with Expo for tracking daily patterns and optimizing life habits. Works on iOS, Android, and Web.

## 🚀 Features

- **Cross-platform**: iOS, Android, and Web support
- **Firebase Integration**: Authentication and database
- **Modern UI**: Clean, responsive design
- **Expo Router**: File-based routing
- **TypeScript**: Full type safety

## 📱 Screens

- **Home**: Welcome screen with login/register options
- **Login**: User authentication
- **Register**: User registration
- **Dashboard**: Main app interface with features

## 🛠️ Tech Stack

- **React Native**: 0.79.4
- **Expo**: 53.0.12
- **React**: 19.0.0
- **TypeScript**: 5.8.3
- **Firebase**: 11.9.1
- **Expo Router**: 5.1.0

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI: `npm install -g @expo/cli`
- Firebase CLI: `npm install -g firebase-tools`

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   # For mobile (iOS/Android)
   npm start
   
   # For web
   npm run web
   ```

3. **Build for production**:
   ```bash
   npm run build:web
   ```

## 🔥 Firebase Setup

1. **Create Firebase project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project named "lifepattern-ai"

2. **Update Firebase config**:
   - Edit `firebase/config.ts`
   - Replace placeholder values with your Firebase config

3. **Deploy to Firebase Hosting**:
   ```bash
   npm run deploy
   ```

## 📁 Project Structure

```
frontend/
├── app/                    # Expo Router pages
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Home page
│   ├── login.tsx          # Login page
│   ├── register.tsx       # Register page
│   └── dashboard.tsx      # Dashboard page
├── firebase/              # Firebase configuration
│   └── config.ts          # Firebase setup
├── assets/                # Images and static files
├── app.json              # Expo configuration
├── firebase.json         # Firebase hosting config
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## 🎯 Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Start Android development
- `npm run ios` - Start iOS development
- `npm run web` - Start web development
- `npm run build:web` - Build for web production
- `npm run deploy` - Deploy to Firebase hosting

## 🔧 Configuration

### Firebase Configuration

Update `firebase/config.ts` with your Firebase project settings:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "lifepattern-ai.firebaseapp.com",
  projectId: "lifepattern-ai",
  storageBucket: "lifepattern-ai.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## 📱 Platform Support

- ✅ **iOS**: Full support with Expo
- ✅ **Android**: Full support with Expo
- ✅ **Web**: Full support with Webpack bundling

## 🚀 Deployment

### Web Deployment

1. **Build the app**:
   ```bash
   npm run build:web
   ```

2. **Deploy to Firebase**:
   ```bash
   npm run deploy
   ```

### Mobile Deployment

1. **Build for production**:
   ```bash
   eas build --platform all
   ```

2. **Submit to stores**:
   ```bash
   eas submit --platform all
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on all platforms
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@lifepattern.ai or create an issue in this repository. 