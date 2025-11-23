import { auth } from "./config";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

export const registerUser = (email: string, password: string) => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }
  return createUserWithEmailAndPassword(auth, email, password);
};

export const loginUser = (email: string, password: string) => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = () => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }
  return signOut(auth);
};
