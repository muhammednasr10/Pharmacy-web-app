import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBwrsvoCfDuyB4-y_KPSM83Fnqt9fY-w1M",
  authDomain: "pharmacy-system-47200.firebaseapp.com",
  projectId: "pharmacy-system-47200",
  storageBucket: "pharmacy-system-47200.firebasestorage.app",
  messagingSenderId: "126114617490",
  appId: "1:126114617490:web:2501b9a9dc1d7afe57ee4b",
  measurementId: "G-GH6Q2YXE3G"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);