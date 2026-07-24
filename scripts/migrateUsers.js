/**
 * Script de migración: Crea cuentas Firebase Auth para los usuarios existentes en RTDB
 * (tanto profesores en /usuarios como alumnos en /alumnos)
 * y elimina las contraseñas almacenadas en texto plano.
 * 
 * USO:
 *   1. Ve a la Consola de Firebase > Configuración del proyecto > Cuentas de servicio
 *   2. Genera una nueva clave privada (JSON)
 *   3. Guardala como `scripts/serviceAccountKey.json`
 *   4. Ejecuta: node scripts/migrateUsers.js
 * 
 * IMPORTANTE: Este script DEBE ejecutarse ANTES de desplegar las nuevas reglas de seguridad.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Configuración ---
const SERVICE_ACCOUNT_PATH = join(__dirname, 'serviceAccountKey.json');
const DATABASE_URL = 'https://portal-idear-default-rtdb.firebaseio.com';
const EMAIL_DOMAIN = 'portal-idear.app';

// --- Inicializar Firebase Admin ---
let serviceAccount;
try {
    serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
} catch (err) {
    console.error('❌ No se encontró serviceAccountKey.json');
    console.error('   Descargalo desde: Firebase Console > Configuración > Cuentas de servicio');
    console.error(`   Guardalo en: ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
}

const app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: DATABASE_URL,
});

const auth = getAuth(app);
const db = getDatabase(app);

const globalResults = {
    migrated: 0,
    alreadyExists: 0,
    errors: []
};

async function migrateCollection(collectionName, isStudent) {
    console.log(`\n--- Migrando ${collectionName} ---`);
    const ref = db.ref(collectionName);
    const snapshot = await ref.get();

    if (!snapshot.exists()) {
        console.log(`⚠️  No se encontraron registros en /${collectionName}`);
        return;
    }

    const data = snapshot.val();

    for (const [key, itemData] of Object.entries(data)) {
        const dni = itemData.dni || key;
        const email = `${dni}@${EMAIL_DOMAIN}`;
        const nombre = isStudent ? (itemData.name || dni) : (itemData.nombre || dni);
        
        // Determinar la contraseña
        // Para profesores, usamos la que tenían. Para alumnos, su DNI es la contraseña por defecto.
        let password = isStudent ? dni : (itemData.password || itemData.clave); 

        // Validación de contraseña corta/faltante
        if (!password || String(password).length < 6) {
            password = 'Cambiar123!'; 
            console.log(`  ⚠️  Clave corta o inválida para ${nombre} (DNI: ${dni}). Se asignó contraseña temporal: Cambiar123!`);
        }

        try {
            // Verificar si el usuario ya existe en Firebase Auth
            try {
                await auth.getUserByEmail(email);
                globalResults.alreadyExists++;
                console.log(`  ✅ ${dni} (${nombre}) — ya existe en Firebase Auth`);

                // Igual eliminar la contraseña de RTDB si es que existe
                if (!isStudent && itemData.password) {
                    await ref.child(key).child('password').remove();
                    console.log(`     🗑️  Contraseña eliminada de RTDB`);
                }
                continue;
            } catch (err) {
                if (err.code !== 'auth/user-not-found') {
                    throw err;
                }
            }

            // Crear usuario en Firebase Auth
            const userRecord = await auth.createUser({
                email,
                password,
                displayName: nombre,
            });

            // Eliminar la contraseña de RTDB para profesores
            if (!isStudent && itemData.password) {
                await ref.child(key).child('password').remove();
                console.log(`     🗑️  Contraseña eliminada de RTDB`);
            }

            globalResults.migrated++;
            console.log(`  ✅ ${dni} (${nombre}) — migrado (UID: ${userRecord.uid})`);

        } catch (err) {
            globalResults.errors.push({ dni, nombre, error: err.message });
            console.error(`  ❌ ${dni} (${nombre}) — ERROR: ${err.message}`);
        }
    }
}

async function migrate() {
    console.log('🔄 Iniciando migración de usuarios a Firebase Auth...\n');

    // Migrar Profesores (usuarios)
    await migrateCollection('usuarios', false);

    // Migrar Alumnos
    await migrateCollection('alumnos', true);

    // 3. Resumen
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(50));
    console.log(`  ✅ Migrados:       ${globalResults.migrated}`);
    console.log(`  ⏭️  Ya existían:    ${globalResults.alreadyExists}`);
    console.log(`  ❌ Errores:        ${globalResults.errors.length}`);
    console.log('='.repeat(50));

    if (globalResults.errors.length > 0) {
        console.log('\n⚠️  Usuarios con errores:');
        globalResults.errors.forEach(({ dni, nombre, error }) => {
            console.log(`  - ${dni} (${nombre}): ${error}`);
        });
    }

    if (globalResults.migrated > 0 || globalResults.alreadyExists > 0) {
        console.log('\n✅ Migración completada. Ahora puedes desplegar las nuevas reglas de seguridad:');
        console.log('   npx -y firebase-tools@latest deploy --only database,firestore');
    }

    process.exit(0);
}

migrate().catch((err) => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
