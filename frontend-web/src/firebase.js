// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDUeCkHTKwfqPLaLs6Wy17cMv7IIODiVOs",
  authDomain: "attendance-system-9db43.firebaseapp.com",
  projectId: "attendance-system-9db43",
  storageBucket: "attendance-system-9db43.firebasestorage.app",
  messagingSenderId: "811051588707",
  appId: "1:811051588707:web:03ecee5108f1f56fa9ec56",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
