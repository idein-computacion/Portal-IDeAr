// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// Configuración utilizando las variables de entorno de Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar los servicios que utilizará el Portal IDeAr
export const auth = getAuth(app);
export const db = getFirestore(app); // Firestore (disponible si se necesita)
export const storage = getStorage(app); // Para guardar archivos (fotos, analíticos, PDFs)
export const rtdb = getDatabase(app); // Base de datos en tiempo real (Realtime Database) - PRINCIPAL

export default app;
