/**
 * Script para exportar / sincronizar las contraseñas de los profesores en Firebase Auth.
 * Asigna a cada profesor de la colección /usuarios su propio DNI como contraseña en Firebase Auth,
 * y se asegura de guardarlo en RTDB en el campo `pass`.
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
    console.error('❌ No se encontró serviceAccountKey.json en:', SERVICE_ACCOUNT_PATH);
    process.exit(1);
}

const app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: DATABASE_URL,
});

const auth = getAuth(app);
const db = getDatabase(app);

async function exportTeacherPasswords() {
    console.log('🔄 Iniciando exportación de contraseñas de profesores a Firebase Auth...\n');
    const ref = db.ref('usuarios');
    const snapshot = await ref.get();

    if (!snapshot.exists()) {
        console.log('⚠️ No se encontraron profesores en la colección /usuarios de RTDB');
        return;
    }

    const profesores = snapshot.val();
    let updatedCount = 0;
    let createdCount = 0;
    let errorCount = 0;

    for (const [key, itemData] of Object.entries(profesores)) {
        const dni = String(itemData.dni || key).trim();
        const nombre = itemData.nombre || dni;
        const email = `${dni.toLowerCase()}@${EMAIL_DOMAIN}`;
        
        let password = dni;
        if (dni.toLowerCase() === 'admin') {
            password = 'admin123';
        } else if (password.length < 6) {
            password = password.padEnd(6, '0');
        }

        try {
            // Guardar o confirmar el campo pass en RTDB para que la tabla en Admin Config lo muestre
            await ref.child(key).update({ pass: password });

            // Verificar si el usuario ya existe en Firebase Auth
            let userRecord = null;
            try {
                userRecord = await auth.getUserByEmail(email);
            } catch (err) {
                if (err.code !== 'auth/user-not-found') {
                    throw err;
                }
            }

            if (userRecord) {
                // Actualizar contraseña al DNI en Firebase Auth
                await auth.updateUser(userRecord.uid, {
                    password: password,
                    displayName: nombre
                });
                updatedCount++;
                console.log(`  ✅ [ACTUALIZADO] ${nombre} (DNI: ${dni}) -> Contraseña en Firebase Auth: "${password}"`);
            } else {
                // Crear usuario en Firebase Auth con contraseña = DNI
                await auth.createUser({
                    email: email,
                    password: password,
                    displayName: nombre
                });
                createdCount++;
                console.log(`  ✨ [CREADO] ${nombre} (DNI: ${dni}) -> Cuenta creada en Firebase Auth con contraseña: "${password}"`);
            }
        } catch (err) {
            errorCount++;
            console.error(`  ❌ [ERROR] ${nombre} (DNI: ${dni}) -> Error: ${err.message}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE EXPORTACIÓN DE CONTRASEÑAS A FIREBASE AUTH');
    console.log('='.repeat(60));
    console.log(`  ✨ Cuentas creadas en Firebase Auth:      ${createdCount}`);
    console.log(`  ✅ Contraseñas actualizadas a su DNI:     ${updatedCount}`);
    console.log(`  ❌ Errores:                               ${errorCount}`);
    console.log('='.repeat(60));
}

exportTeacherPasswords()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error fatal en el script:', err);
        process.exit(1);
    });
