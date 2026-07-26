// src/services/authService.js
// Servicio de autenticación usando Firebase Auth (Email/Password)
// Usa emails sintéticos basados en DNI: {dni}@portal-idear.app

import { auth } from '../config/firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
} from 'firebase/auth';

/**
 * Convierte un DNI/username a un email sintético para Firebase Auth.
 * Ej: "admin" → "admin@portal-idear.app", "12345678" → "12345678@portal-idear.app"
 */
export const dniToEmail = (dni) => `${dni.trim().toLowerCase()}@portal-idear.app`;

/**
 * Extrae el DNI/username de un email sintético.
 * Ej: "admin@portal-idear.app" → "admin"
 */
export const emailToDni = (email) => email.replace('@portal-idear.app', '');

/**
 * Inicia sesión con DNI y contraseña usando Firebase Auth.
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export const loginWithDni = async (dni, password) => {
    const email = dniToEmail(dni);
    return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Crea un nuevo usuario en Firebase Auth.
 * NOTA: Esto solo funciona cuando no hay un usuario logueado,
 * o se usa desde un Admin SDK. Para crear usuarios adicionales
 * mientras hay sesión activa, se usa una segunda instancia de Firebase App.
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export const createAuthUser = async (dni, password) => {
    const email = dniToEmail(dni);
    return createUserWithEmailAndPassword(auth, email, password);
};

/**
 * Cierra la sesión de Firebase Auth.
 */
export const logout = async () => {
    return signOut(auth);
};

/**
 * Observa cambios en el estado de autenticación.
 * @param {function} callback - Se ejecuta con el user o null.
 * @returns {function} unsubscribe
 */
export const observeAuthState = (callback) => {
    return onAuthStateChanged(auth, callback);
};

/**
 * Cambia la contraseña del usuario actual.
 * Requiere re-autenticación previa si la sesión es antigua.
 * @param {string} currentPassword - Contraseña actual
 * @param {string} newPassword - Nueva contraseña
 */
export const changePassword = async (currentPassword, newPassword) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No hay usuario autenticado');
    
    // Re-autenticar antes de cambiar contraseña
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Cambiar contraseña
    return updatePassword(user, newPassword);
};



/**
 * Crea un usuario en Firebase Auth sin afectar la sesión actual.
 * Usa la API REST de Firebase Auth para crear el usuario.
 * Esto es necesario porque createUserWithEmailAndPassword() 
 * automáticamente loguea al nuevo usuario.
 */
export const createAuthUserWithoutSignIn = async (dni, password) => {
    const email = dniToEmail(dni);
    
    // Usar la API REST de Firebase Auth para crear usuario sin afectar la sesión
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                returnSecureToken: false
            })
        }
    );
    
    if (!response.ok) {
        const error = await response.json();
        const errorMessage = error?.error?.message || 'Error creando usuario';
        
        if (errorMessage === 'EMAIL_EXISTS') {
            // El usuario ya existe en Firebase Auth (ej: porque ya está registrado como Alumno en alguna sede).
            // No es un error: permitimos guardar su registro como Profesor en RTDB. Su contraseña es su DNI.
            return { email, existing: true };
        }
        if (errorMessage.startsWith('WEAK_PASSWORD')) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        throw new Error(errorMessage);
    }
    
    return await response.json();
};
