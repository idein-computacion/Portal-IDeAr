/**
 * Script de reparación simplificado: eliminar nodos incorrectos de config/
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

async function repair() {
    // Nodos que no son sedes y fueron contaminados
    const nodesToDelete = [
        'announcements', 'gradeColumns', 'mesasColumns',
        'config-0', 'config-1', 'config-2', 'config-3', 'config-4',
        'config-5', 'config-6', 'config-7', 'config-8', 'config-9',
        'config-10', 'config-11', 'config-12', 'config-13', 'config-14'
    ];

    const updates = {};
    for (const node of nodesToDelete) {
        updates[`config/${node}`] = null;
        console.log(`  ✓ Eliminando config/${node}`);
    }

    console.log(`\nAplicando ${Object.keys(updates).length} eliminaciones...`);
    await update(ref(rtdb), updates);
    console.log("✅ Nodos residuales eliminados.\n");

    // Verificar estado final
    console.log("--- Estado final de config/ ---");
    const snap = await get(ref(rtdb, 'config'));
    const data = snap.val();
    for (const sede of Object.keys(data)) {
        const levels = Object.keys(data[sede]).filter(k => k !== 'info');
        const sample = data[sede][levels[0]];
        console.log(`  ${sede}: ${levels.length} niveles, cuota=${sample?.cuota}, inscripcion=${sample?.inscripcion}`);
    }

    process.exit(0);
}

repair().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
