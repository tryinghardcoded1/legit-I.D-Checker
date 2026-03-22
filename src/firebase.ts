import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyC9DNYy8XSmhivQpiSpjBBBNxC8-H6lNvQ",
  authDomain: "legit-id-checker.firebaseapp.com",
  projectId: "legit-id-checker",
  storageBucket: "legit-id-checker.firebasestorage.app",
  messagingSenderId: "471890834126",
  appId: "1:471890834126:web:0f4777118c16f9e7b8969f",
  measurementId: "G-M6P5B99V6G"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
