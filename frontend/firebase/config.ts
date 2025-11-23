import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBjYxyKuyTHs-rCQsVFYB7inNuYMLTsiqE",
  authDomain: "lifepattern-ai-dc5fe.firebaseapp.com",
  projectId: "lifepattern-ai-dc5fe",
  storageBucket: "lifepattern-ai-dc5fe.firebasestorage.app",
  messagingSenderId: "635658321303",
  appId: "1:635658321303:web:2be6ed11d06ad0a52b58d2",
  measurementId: "G-CNWSMQ70FL"
};

// Safe Firebase initialization with error handling
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

try {
  // Check if Firebase is already initialized
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
  } else {
    app = getApps()[0];
    console.log('✅ Firebase already initialized');
  }

  // Initialize Firebase services
  if (app) {
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (error) {
  console.error('❌ Error initializing Firebase:', error);
  console.warn('⚠️ App will run with limited functionality. Some features may not work.');
}

// Export with null checks
export { auth, db };
export default app; 