import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyC8oH2o_CYmIPFlVwPCS4Okt_txmaflh-0",
  authDomain: "projet-hr.firebaseapp.com",
  projectId: "projet-hr",
  storageBucket: "projet-hr.firebasestorage.app",
  messagingSenderId: "170502723715",
  appId: "1:170502723715:web:c6c4cbe3171e709c9263b6",
  measurementId: "G-D9ZQGNK9X3"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;
