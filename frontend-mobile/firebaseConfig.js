import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUeCkHTKwfqPLaLs6Wy17cMv7IIODiVOs",
  authDomain: "attendance-system-9db43.firebaseapp.com",
  projectId: "attendance-system-9db43",
  storageBucket: "attendance-system-9db43.firebasestorage.app",
  messagingSenderId: "811051588707",
  appId: "1:811051588707:web:03ecee5108f1f56fa9ec56",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);