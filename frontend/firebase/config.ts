import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyACkenk1m7z-X5nzO-eR_KNUwSA5tpdp5s",
    authDomain: "lifepattern-ai.firebaseapp.com",
    projectId: "lifepattern-ai",
    storageBucket: "lifepattern-ai.firebasestorage.app",
    messagingSenderId: "969788561836",
    appId: "1:969788561836:web:dd7c768f7af00108124209",
    measurementId: "G-8P1GJB2062"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
