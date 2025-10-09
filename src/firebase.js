import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCKjJcQ_-ICfXsBjkQPo7QbzAKl45IYdow",
  authDomain: "foxfinance-2a489.firebaseapp.com",
  projectId: "foxfinance-2a489",
  storageBucket: "foxfinance-2a489.firebasestorage.app",
  messagingSenderId: "184929685867",
  appId: "1:184929685867:web:46b919f4fd3cbc51fefc2e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
