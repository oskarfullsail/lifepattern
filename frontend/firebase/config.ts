import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBjYxyKuyTHs-rCQsVFYB7inNuYMLTsiqE",
  authDomain: "lifepattern-ai-dc5fe.firebaseapp.com",
  projectId: "lifepattern-ai-dc5fe",
  storageBucket: "lifepattern-ai-dc5fe.firebasestorage.app",
  messagingSenderId: "635658321303",
  appId: "1:635658321303:web:2be6ed11d06ad0a52b58d2",
  measurementId: "G-CNWSMQ70FL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app; 