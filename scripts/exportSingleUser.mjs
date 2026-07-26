/**
 * Script para crear o actualizar la contraseña de un usuario (DNI) específico en Firebase Auth.
 * Uso: node scripts/exportSingleUser.mjs [DNI]
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVICE_ACCOUNT_PATH = join(__dirname, 'serviceAccountKey.json');
const DATABASE_URL = 'https://portal-idear-default-rtdb.firebaseio.com';
const EMAIL_DOMAIN = 'portal-idear.app';

let serviceAccount;
try {
    serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
} catch (err) {
    console.error('❌ No se encontró serviceAccountKey.json');
    process.exit(1);
}

const app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: DATABASE_URL,
});

const auth = getAuth(app);
const db = getDatabase(app);

async function exportSingleUser(targetDni) {
    const dni = String(targetDni).trim();
    const email = `${dni.toLowerCase()}@${EMAIL_DOMAIN}`;
    const password = dni;

    console.log(`🔄 Sincronizando contraseña en Firebase Auth para DNI: ${dni} (${email})...`);

    // Intentar obtener usuario en Firebase Auth
    let userRecord = null;
    try {
        userRecord = await auth.getUserByEmail(email);
    } catch (err) {
        if (err.code !== 'auth/user-not-found') {
            throw err;
        }
    }

    if (userRecord) {
        // Actualizar contraseña al DNI
        await auth.updateUser(userRecord.uid, {
            password: password
        });
        console.log(`  ✅ [ACTUALIZADO EN AUTH] Usuario ${email} (UID: ${userRecord.uid}) -> Nueva contraseña: "${password}"`);
    } else {
        // Crear en Firebase Auth
        userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: `DNI ${dni}`
        });
        console.log(`  ✨ [CREADO EN AUTH] Usuario ${email} (UID: ${userRecord.uid}) -> Contraseña asignada: "${password}"`);
    }

    // Actualizar campo pass en RTDB si existe en /usuarios/dni
    const userRef = db.ref(`usuarios/${dni}`);
    const userSnap = await userRef.get();
    if (userSnap.exists()) {
        await userRef.update({ pass: password });
        console.log(`  ✅ [RTDB /usuarios/${dni}] Campo 'pass' actualizado a "${password}"`);
    }

    // Actualizar campo pass en RTDB si existe en /alumnos
    const alumnosRef = db.ref('alumnos');
    const alumnosSnap = await alumnosRef.get();
    if (alumnosSnap.exists()) {
        const alumnosData = alumnosSnap.val();
        for (const [key, alumno] of Object.entries(alumnosData)) {
            if (String(alumno.dni).trim() === dni) {
                await alumnosRef.child(key).update({ password: password });
                console.log(`  ✅ [RTDB /alumnos/${key}] Campo 'password' actualizado a "${password}"`);
            }
        }
    }
}

const targetDni = process.argv[2] || '34234803';
exportSingleUser(targetDni)
    .then(() => {
        console.log('\n✅ Sincronización completada.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Error fatal:', err);
        process.exit(1);
    });
