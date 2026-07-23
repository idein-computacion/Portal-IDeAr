/**
 * Script para poner cuotas e inscripciones en 0 en todas las sedes excepto Alem.
 * Ejecutar una sola vez: node scripts/resetCuotas.mjs
 */
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyBVQbazZ6h0S8sqXlChVAAqd3ZmS0XswQw",
    authDomain: "portal-idear.firebaseapp.com",
    projectId: "portal-idear",
    storageBucket: "portal-idear.firebasestorage.app",
    messagingSenderId: "89538422100",
    appId: "1:89538422100:web:e1c3ac895408693d6254c1",
    databaseURL: "https://portal-idear-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

async function resetCuotas() {
    console.log("Leyendo configuración de Firebase...");
    const configSnap = await get(ref(rtdb, 'config'));
    if (!configSnap.exists()) {
        console.log("No existe nodo 'config' en Firebase.");
        process.exit(1);
    }

    const configData = configSnap.val();
    const updates = {};
    let count = 0;

    for (const sede of Object.keys(configData)) {
        // Saltear Alem (cualquier variación del nombre)
        if (sede.toLowerCase().includes('alem')) {
            console.log(`  [SKIP] Sede "${sede}" — no se modifica.`);
            continue;
        }

        console.log(`  Procesando sede: "${sede}"`);
        const sedeData = configData[sede];

        for (const levelKey of Object.keys(sedeData)) {
            if (levelKey === 'info') continue; // No tocar la info general
            
            const level = sedeData[levelKey];
            if (!level || typeof level !== 'object') continue;

            // Poner cuota e inscripcion en 0
            updates[`config/${sede}/${levelKey}/cuota`] = 0;
            updates[`config/${sede}/${levelKey}/inscripcion`] = 0;
            
            // Limpiar historial de precios para que no queden valores viejos
            if (level.historial) {
                updates[`config/${sede}/${levelKey}/historial`] = null;
            }
            
            count++;
            console.log(`    ✓ ${level.curso_nivel || levelKey}: cuota=0, inscripcion=0, historial=borrado`);
        }
    }

    if (count === 0) {
        console.log("\nNo hay niveles para actualizar.");
        process.exit(0);
    }

    console.log(`\nAplicando ${Object.keys(updates).length} cambios en Firebase...`);
    await update(ref(rtdb), updates);
    console.log("✅ Cuotas e inscripciones actualizadas a 0 en todas las sedes (excepto Alem).");
    console.log("✅ Los saldos de los alumnos se recalcularán automáticamente al abrir el portal.");
    process.exit(0);
}

resetCuotas().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
