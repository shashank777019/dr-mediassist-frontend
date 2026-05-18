import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCdCSSqaWGs5t4ByzfJklX-HioTMlffqP4",
  authDomain: "dr-mediassist.firebaseapp.com",
  projectId: "dr-mediassist",
  storageBucket: "dr-mediassist.firebasestorage.app",
  messagingSenderId: "563642204684",
  appId: "1:563642204684:web:4c43b779bdf70f8f01e429",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
