import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCVgadN5Yjvj6-Z1oQvp02v0tNSY-zeseU",
  authDomain: "afy-camera-inventory.firebaseapp.com",
  projectId: "afy-camera-inventory",
  storageBucket: "afy-camera-inventory.firebasestorage.app",
  messagingSenderId: "320438154890",
  appId: "1:320438154890:web:3548dd1af910be9e931f73",
  measurementId: "G-FSFQXHTH38",
  databaseURL: "https://afy-camera-inventory-default-rtdb.firebaseio.com/"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { 
  signInWithPopup, 
  fbSignOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
};
