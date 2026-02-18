import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCvj0UgCH7ulEtdihqXS-VSfCki61gB46Q",
  authDomain: "reminders-ca6ef.firebaseapp.com",
  projectId: "reminders-ca6ef",
  storageBucket: "reminders-ca6ef.firebasestorage.app",
  messagingSenderId: "474107945161",
  appId: "1:474107945161:web:de1149e087baf01038ed18",
};

const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
